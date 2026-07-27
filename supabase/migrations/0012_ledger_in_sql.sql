-- The ledger was computed in TypeScript over four unbounded reads: every
-- source, every contact, every outcome, and every stage_change into not_yet.
-- Two things were wrong with that.
--
-- 1. Supabase caps PostgREST at 1000 rows and returns HTTP 200 with no
--    truncation signal, so past a thousand contacts the page under-reported
--    with no error. The README calls /ledger "the screen that closes the
--    sale"; quietly wrong numbers in front of a funder is the worst failure
--    this product has.
-- 2. It then scanned contacts once per source in memory, which is fine at 250
--    and not at 25,000.
--
-- Both go away by asking Postgres, which is where the data already is.
--
-- security invoker on purpose: RLS on source, contact and outcome applies with
-- the caller's own role, so agency scoping comes from the same policies as
-- everything else rather than being re-implemented here. Nothing in this file
-- needs to know what an agency is.

-- Seconds in the 30.4-day month the TypeScript used, kept identical so the
-- median lag does not shift when this ships:
--   1000 * 60 * 60 * 24 * 30.4 ms = 2626560 s
create or replace function ledger_rows()
returns table (
  source_id uuid,
  name text,
  kind source_kind,
  cost_cents integer,
  hours_invested numeric,
  captured bigint,
  warm bigint,
  inquiries bigint,
  licensed bigint,
  lag_months numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    s.id,
    s.name,
    s.kind,
    s.cost_cents,
    s.hours_invested,
    count(c.id),
    count(c.id) filter (
      where c.stage in ('curious', 'considering', 'not_yet')
        and c.opted_out_at is null
    ),
    count(c.id) filter (where c.stage in ('inquiry', 'licensed')),
    count(o.contact_id),
    percentile_cont(0.5) within group (
      order by extract(epoch from (o.licensed_on::timestamptz - c.captured_at)) / 2626560.0
    ) filter (where o.contact_id is not null)
  from source s
  left join contact c on c.source_id = s.id
  left join outcome o on o.contact_id = c.id
  group by s.id, s.name, s.kind, s.cost_cents, s.hours_invested
  order by count(o.contact_id) desc,
           count(c.id) filter (
             where c.stage in ('curious', 'considering', 'not_yet')
               and c.opted_out_at is null
           ) desc;
$$;

-- The waiting-room callout: of everyone who ever entered not_yet, how many
-- became homes. Counted from stage_change rather than current stage, because
-- the whole claim is about people who have since moved on.
create or replace function ledger_waiting_room()
returns table (ever_not_yet bigint, not_yet_licensed bigint)
language sql
stable
security invoker
set search_path = public
as $$
  with held as (
    select distinct sc.contact_id
      from stage_change sc
     where sc.to_stage = 'not_yet'
  )
  select
    (select count(*) from held),
    (select count(*) from held h join outcome o on o.contact_id = h.contact_id);
$$;

-- Supabase grants EXECUTE on every new public-schema function to anon by
-- default and `revoke ... from public` does not undo it. Neither of these
-- should be callable by a stranger. They are security invoker, so RLS would
-- return nothing to anon anyway, but ADR-007's rule is revoke by name.
revoke all on function ledger_rows() from public, anon;
revoke all on function ledger_waiting_room() from public, anon;
grant execute on function ledger_rows() to authenticated;
grant execute on function ledger_waiting_room() to authenticated;
