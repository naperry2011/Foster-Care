-- Milestone 5, Slice D: a demo agency you can fill and empty in one click.
--
-- Demo data lives in its own agency with its own login rather than a flag on
-- real records. app_user.id is the primary key referencing auth.users, so one
-- user belongs to exactly one agency; mixing demo and pilot data in a single
-- tenant would mean rewriting the RLS spine to tell them apart.

alter table agency
  add column is_demo boolean not null default false,
  add column demo_seeded_at timestamptz;

-- Erase a whole demo agency in one statement. delete_contact() is the right
-- tool for one person; it is the wrong tool for 220 of them.
--
-- The is_demo guard is the point: this function physically cannot touch a
-- pilot agency's data, no matter who calls it or what id they pass.
create or replace function delete_demo_data(p_agency_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_caller_agency uuid;
  v_is_demo boolean;
begin
  if auth.uid() is null then
    raise exception 'not authorized';
  end if;
  select agency_id into v_caller_agency from app_user where id = auth.uid();
  if v_caller_agency is null or v_caller_agency is distinct from p_agency_id then
    raise exception 'not authorized';
  end if;

  select is_demo into v_is_demo from agency where id = p_agency_id;
  if not found then
    raise exception 'agency not found';
  end if;
  if not v_is_demo then
    raise exception 'refusing to bulk-delete a real agency';
  end if;

  perform set_config('porchlight.erasing_contact', 'on', true);
  delete from outcome where agency_id = p_agency_id;
  delete from send_log where agency_id = p_agency_id;
  delete from task where agency_id = p_agency_id;
  delete from contact where agency_id = p_agency_id; -- cascades touch + stage_change
  perform set_config('porchlight.erasing_contact', 'off', true);

  delete from source where agency_id = p_agency_id;
  update agency set demo_seeded_at = null where id = p_agency_id;
end $$;

-- Supabase grants EXECUTE on new public functions to anon by default; see 0004.
revoke all on function delete_demo_data(uuid) from public, anon;
grant execute on function delete_demo_data(uuid) to authenticated;
