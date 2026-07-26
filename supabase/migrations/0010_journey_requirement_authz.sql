-- The Arizona requirement catalog (agency_id is null) was readable by anyone
-- holding the public anon key, which ships in every browser.
--
-- This is the same hole 0004 closed on nurture_template, reintroduced by
-- copying that table's policy from 0002 — the version *before* it was fixed.
-- The content is harmless (Arizona's licensing requirements are public), but
-- the rule is the rule: nothing in this database is readable by a signed-out
-- visitor except through public_capture().
--
-- A policy with no `to` clause applies to every role, anon included. On a
-- table whose whole point is a global row with agency_id null, "or agency_id
-- is null" then evaluates true for a caller who has no agency at all.
-- scripts/anon-audit.mjs caught it; nothing else would have.

drop policy if exists journey_requirement_read on journey_requirement;
create policy journey_requirement_read on journey_requirement for select
  to authenticated
  using (agency_id is null or agency_id = current_agency_id());

-- The write policy is `for all`, which includes SELECT, so it needs the same
-- treatment or it becomes the way back in.
drop policy if exists journey_requirement_write on journey_requirement;
create policy journey_requirement_write on journey_requirement
  for all
  to authenticated
  using (agency_id = current_agency_id())
  with check (agency_id = current_agency_id());
