-- Milestone 2: waiting room, nurture, consent-enforced sending

-- Stage-keyed nurture templates. agency_id NULL = global default;
-- an agency row with the same (stage, step_no) overrides it.
create table nurture_template (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid references agency (id), -- null = global default
  stage contact_stage not null,
  step_no integer not null,
  wait_days integer not null default 0, -- days after entering the stage (or after previous send for not_yet cadence)
  subject text not null,
  body text not null, -- plain text; {{first_name}} and {{unsubscribe_url}} placeholders
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (agency_id, stage, step_no)
);

-- One row per attempted send. The unique constraint IS the idempotency:
-- a template can only ever be sent to a contact once.
create table send_log (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agency (id),
  contact_id uuid not null references contact (id) on delete cascade,
  template_id uuid references nurture_template (id),
  channel touch_channel not null default 'email',
  dedupe_key text not null,
  status text not null default 'sent', -- sent | blocked_consent | blocked_optout | failed
  sent_at timestamptz not null default now(),
  unique (contact_id, dedupe_key)
);

-- Human work queue: wake-ups, replies, cold flags.
create table task (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agency (id),
  contact_id uuid references contact (id) on delete cascade,
  kind text not null, -- wake_up | reply | cold_flag | outcome_confirm
  title text not null,
  due_on date not null default current_date,
  done_at timestamptz,
  created_at timestamptz not null default now()
);
create index on task (agency_id, done_at, due_on);

-- A human reply (or manual hold) pauses the machine for that contact.
alter table contact add column automation_paused_at timestamptz;
-- Cadence bookkeeping for the waiting room.
alter table contact add column last_nurture_at timestamptz;

alter table nurture_template enable row level security;
alter table send_log enable row level security;
alter table task enable row level security;

create policy nurture_template_read on nurture_template for select
  using (agency_id is null or agency_id = current_agency_id());
create policy nurture_template_write on nurture_template
  for all using (agency_id = current_agency_id())
  with check (agency_id = current_agency_id());

create policy send_log_rw on send_log for all
  using (agency_id = current_agency_id())
  with check (agency_id = current_agency_id());

create policy task_rw on task for all
  using (agency_id = current_agency_id())
  with check (agency_id = current_agency_id());

-- ============ global default nurture content ============
-- Stage 'considering': answer the questions people are privately asking.
insert into nurture_template (agency_id, stage, step_no, wait_days, subject, body) values
(null, 'curious', 1, 1, 'Thanks for stopping by',
'Hi {{first_name}},

Thanks for your interest in fostering. No forms, no pressure — just one honest resource to start with: most people who foster started exactly where you are, curious and unsure.

If you ever want to talk to a real person, just reply to this email.

{{unsubscribe_url}}'),
(null, 'considering', 1, 3, 'Am I even eligible to foster?',
'Hi {{first_name}},

The question almost everyone asks first, and is embarrassed to ask out loud: am I eligible?

The short version in Arizona: you can be single or married, renting or owning, working full-time or retired. You need a safe home, a stable income (any size), and to pass a background check. A spare bedroom matters for licensing, but there is more flexibility than people assume.

Reply with any question — a human reads these.

{{unsubscribe_url}}'),
(null, 'considering', 2, 10, 'What fostering actually costs (and pays)',
'Hi {{first_name}},

Money is the second question nobody asks out loud. Foster parents in Arizona receive a monthly reimbursement per child that covers room, board, and daily needs, plus AHCCCS medical coverage for the child. Licensing itself costs almost nothing — training is free and agencies help with home requirements.

Nobody fosters for the money. But it should not cost you your savings, and it is set up so it does not.

{{unsubscribe_url}}'),
(null, 'considering', 3, 21, 'A week in the life of a foster family',
'Hi {{first_name}},

School drop-offs. A caseworker visit once a month. A court date you attend twice a year. Dinner, homework, bedtime. Most of fostering is ordinary family life — with more paperwork and more meaning.

When you are ready to hear what the first 90 days look like, reply and we will walk you through it.

{{unsubscribe_url}}'),
(null, 'not_yet', 1, 90, 'No pressure — just leaving the porch light on',
'Hi {{first_name}},

A while back you said fostering might be something for later. That is a completely good answer — this is just us keeping the light on.

Nothing is required of you. When the time is right, we will be easy to find.

{{unsubscribe_url}}');
