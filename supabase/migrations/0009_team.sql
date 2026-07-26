-- Milestone 5, Slice G: more than one person per agency.
--
-- Until now the only way into an agency was the onboarding page writing
-- `agency` and `app_user` with the service-role key, straight through RLS,
-- from a request handler. That worked because there was exactly one user per
-- agency and nobody to invite. It is also the one place in the product where
-- app code holds a key that can see every tenant, which is precisely the thing
-- the rest of the schema is built to make impossible.
--
-- Both paths become security-definer RPCs with narrow, checkable rules, and
-- the service-role import disappears from src/app entirely.

create table agency_invite (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agency (id),
  email text not null,
  role text not null default 'recruiter',
  -- 64 hex chars from two UUIDs: pgcrypto's gen_random_bytes lives in a
  -- different schema on Supabase and search_path games are not worth it here.
  token text not null unique default
    replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  invited_by_user_id uuid references app_user (id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_at timestamptz,
  accepted_by_user_id uuid references app_user (id),
  revoked_at timestamptz
);

-- One live invite per address per agency; re-inviting after a revoke is fine.
create unique index agency_invite_live on agency_invite (agency_id, lower(email))
  where accepted_at is null and revoked_at is null;

create index on agency_invite (agency_id);

alter table agency_invite enable row level security;

-- Members manage their own agency's invites. The invitee never reads this
-- table — they have no agency yet, so RLS would hide the row from them. They
-- go through the two security-definer functions below instead.
create policy agency_invite_rw on agency_invite for all
  using (agency_id = current_agency_id())
  with check (agency_id = current_agency_id());

-- ============ joining ============

-- First user, no agency: create one and become its director.
-- Replaces the service-role insert that used to live in the onboarding page.
create or replace function create_agency(p_name text, p_full_name text default null)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_agency uuid;
begin
  if auth.uid() is null then
    raise exception 'not authorized';
  end if;
  if exists (select 1 from app_user where id = auth.uid()) then
    raise exception 'already a member of an agency';
  end if;
  if coalesce(trim(p_name), '') = '' then
    raise exception 'agency name required';
  end if;

  insert into agency (name) values (trim(p_name)) returning id into v_agency;
  insert into app_user (id, agency_id, full_name, role)
    values (auth.uid(), v_agency, nullif(trim(p_full_name), ''), 'director');
  return v_agency;
end $$;

-- What a signed-in person sees before deciding to join. Deliberately returns
-- nothing identifying about the agency's data — just the name and whether the
-- invite is still good.
create or replace function invite_preview(p_token text)
returns table (agency_name text, invited_email text, valid boolean)
language plpgsql security definer set search_path = public as $$
begin
  return query
  select a.name,
         i.email,
         (i.accepted_at is null and i.revoked_at is null and i.expires_at > now())
    from agency_invite i join agency a on a.id = i.agency_id
   where i.token = p_token;
end $$;

-- Join the agency that invited you.
--
-- The token alone is not enough: the signed-in address must match the invited
-- one. A link forwarded to the wrong person, or pasted into a group chat,
-- cannot be used to walk into somebody else's tenant.
create or replace function accept_invite(p_token text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_invite agency_invite%rowtype;
  v_email text;
begin
  if auth.uid() is null then
    raise exception 'not authorized';
  end if;
  if exists (select 1 from app_user where id = auth.uid()) then
    raise exception 'already a member of an agency';
  end if;

  select * into v_invite from agency_invite where token = p_token for update;
  if not found then
    raise exception 'invitation not found';
  end if;
  if v_invite.accepted_at is not null then
    raise exception 'invitation already used';
  end if;
  if v_invite.revoked_at is not null then
    raise exception 'invitation was revoked';
  end if;
  if v_invite.expires_at <= now() then
    raise exception 'invitation has expired';
  end if;

  select email into v_email from auth.users where id = auth.uid();
  if lower(coalesce(v_email, '')) is distinct from lower(v_invite.email) then
    raise exception 'this invitation was sent to a different email address';
  end if;

  insert into app_user (id, agency_id, role) values (auth.uid(), v_invite.agency_id, v_invite.role);

  update agency_invite
     set accepted_at = now(), accepted_by_user_id = auth.uid()
   where id = v_invite.id;

  return v_invite.agency_id;
end $$;

-- Supabase grants EXECUTE on every new public function to anon by default and
-- `revoke ... from public` does not undo it — revoke anon by name. ADR-007.
-- create_agency and accept_invite both write app_user; an anon caller has a
-- null auth.uid() and would trip the guards above, but defence in depth is the
-- whole reason that hole was found in the first place.
revoke all on function create_agency(text, text) from public, anon;
revoke all on function invite_preview(text) from public, anon;
revoke all on function accept_invite(text) from public, anon;
grant execute on function create_agency(text, text) to authenticated;
grant execute on function invite_preview(text) to authenticated;
grant execute on function accept_invite(text) to authenticated;
