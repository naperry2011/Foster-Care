-- Porchlight core schema (spec §05)
-- Principles enforced here, not in app code:
--   1. contact.source_id is NOT NULL and immutable (no orphan contacts, ever)
--   2. stage_change is append-only; contact.stage moves only through set_contact_stage()
--   3. consent is a column; opt-out is irreversible
--   4. every table is agency-scoped with RLS

create type source_kind as enum ('event','ambassador','digital','partner','walk_in');
create type contact_stage as enum ('unaware','curious','considering','not_yet','inquiry','licensed','declined');
create type touch_direction as enum ('out','in');
create type touch_channel as enum ('sms','email','call','in_person');

create table agency (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- app users, keyed to auth.users
create table app_user (
  id uuid primary key references auth.users (id) on delete cascade,
  agency_id uuid not null references agency (id),
  full_name text,
  role text not null default 'recruiter', -- recruiter | director
  created_at timestamptz not null default now()
);

create table source (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agency (id),
  kind source_kind not null,
  name text not null,
  slug text not null unique, -- public capture URL /c/[slug]
  owner_user_id uuid references app_user (id),
  cost_cents integer not null default 0,
  hours_invested numeric(7,2) not null default 0,
  occurred_on date,
  location text,
  created_at timestamptz not null default now()
);

create table contact (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agency (id),
  source_id uuid not null references source (id), -- the load-bearing column
  captured_by_user_id uuid references app_user (id),
  captured_at timestamptz not null default now(),
  phone text,
  email text,
  first_name text,
  last_name text,
  stage contact_stage not null default 'curious',
  wake_up_on date, -- the waiting-room clock
  consent_sms boolean not null default false,
  consent_email boolean not null default false,
  opted_out_at timestamptz,
  referred_by_contact_id uuid references contact (id),
  notes text,
  constraint contact_reachable check (phone is not null or email is not null)
);

create table touch (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agency (id),
  contact_id uuid not null references contact (id) on delete cascade,
  direction touch_direction not null,
  channel touch_channel not null,
  occurred_at timestamptz not null default now(),
  body text,
  sequence_id uuid,
  created_by_user_id uuid references app_user (id)
);

create table stage_change (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agency (id),
  contact_id uuid not null references contact (id) on delete cascade,
  from_stage contact_stage,
  to_stage contact_stage not null,
  occurred_at timestamptz not null default now(),
  actor_user_id uuid references app_user (id),
  reason text
);

create table outcome (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agency (id),
  contact_id uuid not null unique references contact (id),
  licensed_on date not null,
  first_placement_on date,
  confirmed_by_user_id uuid references app_user (id),
  backfilled boolean not null default false,
  created_at timestamptz not null default now()
);

create index on contact (agency_id, stage);
create index on contact (agency_id, wake_up_on) where wake_up_on is not null;
create index on contact (source_id);
create index on touch (contact_id, occurred_at desc);
create index on stage_change (contact_id, occurred_at);
create index on source (agency_id);

-- ============ immutability & append-only guards ============

create or replace function forbid_source_change() returns trigger
language plpgsql as $$
begin
  if new.source_id is distinct from old.source_id then
    raise exception 'contact.source_id is immutable';
  end if;
  if new.captured_at is distinct from old.captured_at then
    raise exception 'contact.captured_at is immutable';
  end if;
  -- opt-out is irreversible
  if old.opted_out_at is not null and new.opted_out_at is distinct from old.opted_out_at then
    raise exception 'opt-out is irreversible';
  end if;
  return new;
end $$;

create trigger contact_immutable_cols
  before update on contact
  for each row execute function forbid_source_change();

create or replace function forbid_mutation() returns trigger
language plpgsql as $$
begin
  raise exception '% is append-only', tg_table_name;
end $$;

create trigger stage_change_append_only
  before update or delete on stage_change
  for each row execute function forbid_mutation();
create trigger touch_append_only
  before update or delete on touch
  for each row execute function forbid_mutation();

-- direct stage updates outside the function are blocked
create or replace function forbid_direct_stage_update() returns trigger
language plpgsql as $$
begin
  if new.stage is distinct from old.stage
     and current_setting('porchlight.stage_change_ok', true) is distinct from 'on' then
    raise exception 'use set_contact_stage() to change stage';
  end if;
  return new;
end $$;

-- set_contact_stage flags the setting around its update
create or replace function set_contact_stage(
  p_contact_id uuid,
  p_to_stage contact_stage,
  p_reason text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_from contact_stage;
  v_agency uuid;
begin
  select stage, agency_id into v_from, v_agency
    from contact where id = p_contact_id for update;
  if not found then
    raise exception 'contact not found';
  end if;
  if v_agency is distinct from (select agency_id from app_user where id = auth.uid()) then
    raise exception 'not authorized';
  end if;
  if v_from = p_to_stage then
    return;
  end if;
  perform set_config('porchlight.stage_change_ok', 'on', true);
  update contact set stage = p_to_stage,
    wake_up_on = case when p_to_stage = 'not_yet' then wake_up_on else null end
    where id = p_contact_id;
  perform set_config('porchlight.stage_change_ok', 'off', true);
  insert into stage_change (agency_id, contact_id, from_stage, to_stage, actor_user_id, reason)
    values (v_agency, p_contact_id, v_from, p_to_stage, auth.uid(), p_reason);
end $$;

create trigger contact_stage_guard
  before update on contact
  for each row execute function forbid_direct_stage_update();

-- ============ RLS ============

alter table agency enable row level security;
alter table app_user enable row level security;
alter table source enable row level security;
alter table contact enable row level security;
alter table touch enable row level security;
alter table stage_change enable row level security;
alter table outcome enable row level security;

create or replace function current_agency_id() returns uuid
language sql stable security definer set search_path = public as $$
  select agency_id from app_user where id = auth.uid();
$$;

create policy agency_read on agency for select
  using (id = current_agency_id());

create policy app_user_same_agency on app_user for select
  using (agency_id = current_agency_id());
create policy app_user_self_update on app_user for update
  using (id = auth.uid());

create policy source_rw on source for all
  using (agency_id = current_agency_id())
  with check (agency_id = current_agency_id());

create policy contact_rw on contact for all
  using (agency_id = current_agency_id())
  with check (agency_id = current_agency_id());

create policy touch_rw on touch for all
  using (agency_id = current_agency_id())
  with check (agency_id = current_agency_id());

create policy stage_change_rw on stage_change for all
  using (agency_id = current_agency_id())
  with check (agency_id = current_agency_id());

create policy outcome_rw on outcome for all
  using (agency_id = current_agency_id())
  with check (agency_id = current_agency_id());

-- Public capture inserts happen through a security-definer RPC (no anon table access)
create or replace function public_capture(
  p_slug text,
  p_phone text default null,
  p_email text default null,
  p_first_name text default null,
  p_last_name text default null,
  p_consent_email boolean default false,
  p_consent_sms boolean default false
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_source source%rowtype;
  v_id uuid;
begin
  if p_phone is null and p_email is null then
    raise exception 'phone or email required';
  end if;
  select * into v_source from source where slug = p_slug;
  if not found then
    raise exception 'unknown capture link';
  end if;
  insert into contact (agency_id, source_id, phone, email, first_name, last_name,
                       consent_email, consent_sms, stage)
    values (v_source.agency_id, v_source.id, nullif(trim(p_phone), ''), nullif(trim(p_email), ''),
            nullif(trim(p_first_name), ''), nullif(trim(p_last_name), ''),
            p_consent_email, p_consent_sms, 'curious')
    returning id into v_id;
  insert into stage_change (agency_id, contact_id, from_stage, to_stage, reason)
    values (v_source.agency_id, v_id, null, 'curious', 'public capture');
  return v_id;
end $$;

grant execute on function public_capture to anon, authenticated;
grant execute on function set_contact_stage to authenticated;
