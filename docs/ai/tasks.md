# Tasks

Active work. Update as items are completed and new work is identified.

## Current milestone

**Milestone 5 — Client-ready. Complete (A–H), merged to `main`.**

A (app shell + bug sweep) · B (contact detail + timeline) · C (design system) ·
D (demo agency) · E (Arizona data) · F (onboarding progress) · G (teammates) ·
H (suites + docs)

Migrations 0001–0010 applied. Five suites green: smoke 59/59, cron 10/10,
anon-audit 35 safe / 0 exposed, demo-test 5/5, plus `purge-test-agencies`.

**Live at https://porchlightfostercare.org** — see `docs/deploy-setup.md` for
the runbook and what was verified.

---

## Next

1. **Finish proving production** — the only two things a terminal can't check:
   - [ ] Sign in at `porchlightfostercare.org/login` and confirm the emailed
         link resolves (delivery, not just link generation — the allow-list is
         already verified)
   - [ ] Scan a printed QR from a phone on mobile data; contact lands on `/board`
2. **Resend account.** No nurture email has ever actually been sent. This is the
   largest untested surface in the product and the only one that touches a
   stranger's inbox. The domain (`porchlightfostercare.org`) is already in hand
   to verify against. It cannot be rehearsed on the demo agency — `send.ts`
   refuses demo tenants and fails closed (ADR-010).
3. **Design-partner onboarding.** Seed their sources, backfill known licensed
   homes, set their counties on `/arizona`.
4. **Playwright e2e** (event → QR capture → board → stage change) and the
   throttled-3G check on `/c/[slug]`.
5. **Suites into CI** — needs a throwaway Supabase project so a run can create
   and destroy tenants without touching the pilot database.

## Arizona data upkeep

Refresh twice a year, by hand — `dcs.az.gov` 403s every server-side fetcher, so
a human with a real browser is part of the pipeline.

1. Download both workbooks into `az_docs/` (gitignored) — links and tab layout
   in `docs/az-data-sources.md`.
2. `node scripts/az-stats-import.mjs` to see the diff.
3. `node scripts/az-stats-import.mjs --apply` to write it.

Update the filename and `az_stat_source` title constants at the top of the
script when the reports change edition.

## Apply before anything else

- [ ] **Run migration `0011_tenancy_and_unsubscribe.sql`.** Forward-only, not
      idempotent, run once. The code is already merged and is ahead of the
      database: until this runs, `public_unsubscribe()` does not exist and the
      unsubscribe page will fail. Then re-run `smoke-test` (three new tenancy
      assertions) and `anon-audit` (two new `public_unsubscribe` assertions).
- [ ] Confirm which Vercel environments carry `CRON_SECRET` and
      `INBOUND_WEBHOOK_SECRET`. The endpoints now refuse when the variable is
      missing rather than accepting the literal "Bearer undefined", so a preview
      deployment that lacked them was open and will now correctly 401.

## Blocked

- [ ] Twilio A2P 10DLC registration — needs a legal business entity/EIN
- [ ] Real email send never verified — needs a Resend account + verified domain

## Bugs

- (none open)

## Tech Debt

- [ ] `/ledger` aggregates in TypeScript over every contact; move to a SQL view past ~1,000
- [ ] A send that crashes mid-flight leaves a `sending` row that never retries (deliberate: prefers a missed email to a double-send)
- [ ] Board has no drag-and-drop; per-card `<select>` is the mechanism
- [ ] Suites aren't in CI — needs a throwaway Supabase project
- [ ] Invitations aren't emailed; the recruiter copies the link and sends it themselves
- [ ] `delete_demo_data()` doesn't clear `agency_county`, `agency_target` or `agency_invite` — `seedDemoAgency` clears them itself, so a rebuild is still identical, but "empty it out" leaves them behind
- [ ] Onboarding progress is only reachable from a contact's page; there is no "who's in onboarding" list

### Closed by M5

- ~~Onboarding creates one agency per user via the service role~~ — replaced by
  `create_agency()` in 0009 (ADR-012)
