-- A dead tick currently looks exactly like a quiet week. (audit F-011)
--
-- Every scheduled thing in the product -- wake-ups, nurture, quarterly cadence,
-- cold flags, the monthly outcome prompt -- hangs off one daily Vercel cron. If
-- it stops firing, nothing in the app changes: the board looks calm, /tasks is
-- empty, the ledger reports what it always did. Silence is the success case and
-- the failure case at once, and in October that silence would be a real family
-- waiting on an email nobody knows was never sent.
--
-- So the tick writes down that it ran. One row per attempt, not per success:
-- a run that starts and never finishes is the exact shape of a timeout, and
-- overwriting a single "last run" column would hide it.
--
-- Re-runnable on purpose -- a hand-paste that half-fails gets pasted again.

create table if not exists cron_run (
  id uuid primary key default gen_random_uuid(),
  job text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  ok boolean,
  -- what the run did (wakeUps, nurtureSent, ...), kept as-is so adding a phase
  -- to the tick never needs another migration
  stats jsonb,
  -- one entry per phase that threw. A phase failing no longer aborts the rest
  -- of the tick, so this is how a partial run stays visible instead of looking
  -- like a clean one with small numbers.
  errors jsonb
);

-- The only question ever asked of this table is "when did <job> last finish
-- cleanly", so the index is written for exactly that.
drop index if exists cron_run_job_started_idx;
create index cron_run_job_started_idx on cron_run (job, started_at desc);

-- Deliberately has no agency_id: this is system health, not tenant data, and
-- giving it one would invite a director's page to read another agency's
-- send counts through it.
--
-- RLS on with no policy at all is the point. Postgres denies by default, so
-- anon and authenticated can read nothing here; service_role bypasses RLS and
-- is the only thing that writes it (the cron) or reads it (the status
-- endpoint). If this ever needs to appear in the UI, it wants a narrow
-- security-definer function returning staleness, not a policy on the table.
alter table cron_run enable row level security;
