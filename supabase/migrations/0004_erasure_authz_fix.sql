-- SECURITY FIX for 0003.
--
-- delete_contact() was callable by anonymous visitors, who could erase any
-- contact in any agency. Two mistakes compounded:
--
--   1. `revoke all ... from public` does not remove the grant Supabase's
--      default privileges hand to the `anon` role on every new function in
--      the public schema. anon must be revoked by name.
--   2. The ownership check was skipped when auth.uid() was null, so that
--      service_role scripts could clean up. Anonymous requests also have a
--      null uid, so that carve-out was the hole.
--
-- Erasure is now strictly a signed-in action by a member of the owning
-- agency. There is no privileged bypass: system scripts sign in as a real
-- user like everyone else.

create or replace function delete_contact(p_contact_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_agency uuid;
  v_caller_agency uuid;
begin
  if auth.uid() is null then
    raise exception 'not authorized';
  end if;

  select agency_id into v_caller_agency from app_user where id = auth.uid();
  if v_caller_agency is null then
    raise exception 'not authorized';
  end if;

  select agency_id into v_agency from contact where id = p_contact_id;
  if not found then
    raise exception 'contact not found';
  end if;
  if v_agency is distinct from v_caller_agency then
    raise exception 'not authorized';
  end if;

  perform set_config('porchlight.erasing_contact', 'on', true);
  delete from contact where id = p_contact_id;
  perform set_config('porchlight.erasing_contact', 'off', true);
end $$;

revoke all on function delete_contact(uuid) from public, anon;
grant execute on function delete_contact(uuid) to authenticated;

-- Same trap applies to every other function here: anon should only ever be
-- able to call public_capture (the capture page's one write path).
revoke all on function set_contact_stage(uuid, contact_stage, text, date) from anon;
revoke all on function current_agency_id() from anon;

-- The global default nurture templates (agency_id is null) were readable by
-- anyone holding the public anon key. It is only email copy, but nothing here
-- needs to be readable by a signed-out visitor.
drop policy if exists nurture_template_read on nurture_template;
create policy nurture_template_read on nurture_template for select
  to authenticated
  using (agency_id is null or agency_id = current_agency_id());
