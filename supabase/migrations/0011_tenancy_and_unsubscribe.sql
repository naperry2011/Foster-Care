-- Two holes the audit found, both in the same shape: a door that was left
-- wider than the thing behind it needed.
--
-- 1. app_user's UPDATE policy had no `with check` and no column restriction,
--    so the one row that decides which tenant you are in was writable by you.
-- 2. The unsubscribe page held a service-role client on a route open to the
--    internet, because there was no narrow door for an anonymous opt-out.

-- ---------------------------------------------------------------------------
-- 1. A member may edit their own name. Nothing else. (audit F-003)
--
-- The old policy was `for update using (id = auth.uid())` with no `with check`.
-- Postgres reuses USING as the check when WITH CHECK is absent, so the only
-- constraint on the new row was that it was still your own row: agency_id and
-- role were both free. current_agency_id() reads agency_id from this very row
-- and every RLS policy in the schema is written against it, so rewriting it
-- was a tenant hop, gated only by knowing another agency's uuid.
--
-- The policy alone cannot express "these columns may not change" -- WITH CHECK
-- sees only the new row, and comparing it to the old one from inside a policy
-- would recurse through this same policy. So the guard is a trigger, which can
-- see OLD and NEW, and the policy keeps the row-level rule.

drop policy if exists app_user_self_update on app_user;
create policy app_user_self_update on app_user for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create or replace function forbid_self_tenancy_change() returns trigger
language plpgsql as $$
begin
  -- service_role (system jobs, admin scripts, accept_invite) is unrestricted;
  -- this guards the signed-in path only.
  if auth.uid() is null then
    return new;
  end if;
  if new.agency_id is distinct from old.agency_id then
    raise exception 'app_user.agency_id cannot be changed';
  end if;
  if new.role is distinct from old.role then
    raise exception 'app_user.role cannot be changed by its own holder';
  end if;
  return new;
end $$;

create trigger app_user_tenancy_immutable
  before update on app_user
  for each row execute function forbid_self_tenancy_change();

-- ---------------------------------------------------------------------------
-- 2. A narrow door for anonymous opt-out. (audit F-004, F-012)
--
-- /u/[id] is reachable by anyone and was calling createAdminClient(), which
-- can read and write every tenant, to flip three columns on one row. ADR-012
-- removed the service-role key from src/app on exactly this reasoning; the
-- capability came back through an import. This is the same pattern as
-- public_capture(): one security-definer function that does one thing.
--
-- Idempotent on purpose. Opt-out is irreversible by trigger, so a second call
-- must be a no-op rather than an error -- a mail client that retries, or a
-- person who clicks the link twice, should both see "you're unsubscribed".
create or replace function public_unsubscribe(p_contact_id uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_exists boolean;
begin
  select true into v_exists from contact where id = p_contact_id;
  if not found then
    return false;
  end if;

  update contact
     set opted_out_at = now(),
         consent_email = false,
         consent_sms = false
   where id = p_contact_id
     and opted_out_at is null;

  return true;
end $$;

-- Supabase grants EXECUTE on every new public-schema function to anon by
-- default and `revoke ... from public` does not undo it, so state both sides
-- explicitly. Here anon is intended: the recipient of an email has no session.
-- ADR-007's rule is "revoke by name unless deliberate", and this is deliberate.
revoke all on function public_unsubscribe(uuid) from public;
grant execute on function public_unsubscribe(uuid) to anon, authenticated;
