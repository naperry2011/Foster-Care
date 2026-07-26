-- Milestone 5, Slice F: onboarding progress for a family that has inquired.
--
-- This is a deliberate step towards spec §02's fence, and stops well short of
-- it. Porchlight tracks *whether* a family has cleared a requirement. It does
-- not hold documents, signatures, assessments, or anything about a child. It
-- is a checklist a recruiter can read down the phone, not a licensing system.
-- The word "licensing" appears nowhere in the UI; it is "onboarding progress".
--
-- A family in onboarding stays at stage 'inquiry' with a parallel journey row.
-- No new contact_stage value: adding one would silently reinterpret every
-- stage_change already written, and would fall out of BOARD_STAGES,
-- WARM_STAGES and the cron's stage filters — three places that would each
-- start lying at once.

-- The catalog. agency_id null = the global Arizona default; an agency row with
-- the same code overrides it. Same shape as nurture_template.
create table journey_requirement (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid references agency (id), -- null = global default
  code text not null,                    -- stable id; how an override matches
  step_no integer not null,
  label text not null,
  detail text,
  category text not null,                -- eligibility | background | training | home | health
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (agency_id, code)
);

create table journey (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agency (id),
  -- ON DELETE CASCADE is load-bearing: delete_contact() erases a person whole,
  -- and a journey that refuses to go with them aborts the erasure, which takes
  -- purgeAgency down with it and turns every verification suite red.
  contact_id uuid not null unique references contact (id) on delete cascade,
  started_on date not null default current_date,
  completed_on date,
  created_at timestamptz not null default now()
);

create table journey_step (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agency (id),
  journey_id uuid not null references journey (id) on delete cascade,
  -- label and step_no are copied from the requirement, not joined to it. A
  -- family's record should say what was asked of *them*; editing the catalog
  -- next year must not rewrite what someone completed last year.
  requirement_code text not null,
  step_no integer not null,
  label text not null,
  category text not null,
  completed_on date,
  completed_by_user_id uuid references app_user (id),
  note text,
  unique (journey_id, requirement_code)
);

create index on journey (agency_id);
create index on journey_step (journey_id, step_no);

-- ============ RLS ============

alter table journey_requirement enable row level security;
alter table journey enable row level security;
alter table journey_step enable row level security;

create policy journey_requirement_read on journey_requirement for select
  using (agency_id is null or agency_id = current_agency_id());
create policy journey_requirement_write on journey_requirement
  for all using (agency_id = current_agency_id())
  with check (agency_id = current_agency_id());

create policy journey_rw on journey for all
  using (agency_id = current_agency_id())
  with check (agency_id = current_agency_id());

create policy journey_step_rw on journey_step for all
  using (agency_id = current_agency_id())
  with check (agency_id = current_agency_id());

-- ============ completion ============

-- Keep journey.completed_on true to the steps, in the database, so it cannot
-- drift from what the checklist actually says.
--
-- Note what this does NOT do: it never touches contact.stage. Finishing every
-- step is grounds for a recruiter to be *asked* whether the family is
-- licensed. Arizona licenses families; a checkbox in a recruitment tool does
-- not, and a product that quietly marks people licensed would poison the one
-- number the attribution ledger is trusted for.
create or replace function refresh_journey_completion() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_journey uuid := coalesce(new.journey_id, old.journey_id);
  v_open integer;
  v_last date;
begin
  select count(*) filter (where completed_on is null), max(completed_on)
    into v_open, v_last
    from journey_step where journey_id = v_journey;

  update journey
     set completed_on = case when v_open = 0 then v_last else null end
   where id = v_journey;

  return null;
end $$;

create trigger journey_step_completion
  after insert or update or delete on journey_step
  for each row execute function refresh_journey_completion();

-- Start a family's checklist from the effective catalog: the agency's own
-- version of a requirement where one exists, the Arizona default otherwise.
-- Idempotent — calling it twice returns the existing journey rather than
-- resetting somebody's progress.
create or replace function start_journey(p_contact_id uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_agency uuid;
  v_journey uuid;
begin
  if auth.uid() is null then
    raise exception 'not authorized';
  end if;

  select agency_id into v_agency from contact where id = p_contact_id;
  if not found then
    raise exception 'contact not found';
  end if;
  if v_agency is distinct from (select agency_id from app_user where id = auth.uid()) then
    raise exception 'not authorized';
  end if;

  select id into v_journey from journey where contact_id = p_contact_id;
  if found then
    return v_journey;
  end if;

  insert into journey (agency_id, contact_id) values (v_agency, p_contact_id)
    returning id into v_journey;

  insert into journey_step (agency_id, journey_id, requirement_code, step_no, label, category)
  select v_agency, v_journey, r.code, r.step_no, r.label, r.category
    from (
      -- agency_id nulls last puts an agency's override ahead of the global
      -- row, so distinct on picks the override when one exists.
      select distinct on (code) code, step_no, label, category
        from journey_requirement
       where active and (agency_id = v_agency or agency_id is null)
       order by code, agency_id nulls last
    ) r
   order by r.step_no;

  return v_journey;
end $$;

-- Supabase grants EXECUTE on every new public function to anon by default,
-- and `revoke ... from public` does not undo it. Revoke anon by name. ADR-007.
revoke all on function start_journey(uuid) from public, anon;
grant execute on function start_journey(uuid) to authenticated;
revoke all on function refresh_journey_completion() from public, anon;

-- ============ the Arizona default catalog ============
--
-- Structure only, deliberately no hour counts. DCS's own foster-care FAQ says
-- 15 in-class hours while its training page describes a schedule implying
-- roughly double that, and the two pages have never been reconciled. Printing
-- either number would make Porchlight the source of a figure Arizona itself is
-- inconsistent about, in front of a family deciding whether they can afford
-- the time. We cite the shape of the requirement and let the agency say how
-- long their sessions run.

insert into journey_requirement (agency_id, code, step_no, label, category, detail) values
  (null, 'az_age_21', 10, 'At least 21 years old', 'eligibility',
   'Arizona''s minimum age for a foster licence. Applies to the applicant, not to everyone in the household.'),

  (null, 'az_fingerprint_card', 20, 'Level 1 Fingerprint Clearance Card', 'background',
   'Issued by the Arizona Department of Public Safety. Start it early — it is the step most likely to hold everything else up.'),

  (null, 'az_background_checks', 30, 'FBI and local background checks', 'background',
   'Required for every adult living in the home, not only the applicants.'),

  (null, 'az_training_online', 40, 'Three computer-based trainings', 'training',
   'Completed at home, at your own pace, before the live sessions.'),

  (null, 'az_training_webinars', 50, 'Ten instructor-led webinars', 'training',
   'Delivered live across five weeks. Ask your agency about session length and make-up options.'),

  (null, 'az_training_window', 60, 'All training finished within eight weeks', 'training',
   'The window runs from when training starts, so it is worth agreeing a start date the family can actually keep.'),

  (null, 'az_medical', 70, 'Medical qualification', 'health',
   'A physician''s statement that the applicants are well enough to care for a child.'),

  (null, 'az_life_safety', 80, 'Home life-safety inspection', 'home',
   'Covers smoke alarms, water temperature, medication and firearm storage, and sleeping arrangements.'),

  (null, 'az_home_study', 90, 'Home study', 'home',
   'Interviews and a written family assessment. The longest step, and the one families most need reassurance about.');
