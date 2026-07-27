# Tasks

Active work. Update as items are completed and new work is identified.

## Current milestone

**Milestone 5 — Client-ready. Complete (A–H), merged to `main`.**

A (app shell + bug sweep) · B (contact detail + timeline) · C (design system) ·
D (demo agency) · E (Arizona data) · F (onboarding progress) · G (teammates) ·
H (suites + docs)

Migrations **0001–0012** applied. Suites green: smoke **62/62**, cron 10/10,
anon-audit **39 safe / 0 exposed**, demo-test 5/5, `ledger-parity` clean, plus
`purge-test-agencies`.

**Live at https://porchlightfostercare.org** — see `docs/deploy-setup.md` for
the runbook and what was verified.

**An engineering audit lives in `docs/audit/`** (21 findings). Horizon 1 is
closed; tagged `v0.6.0`. **No open Critical or High findings.** Read
`docs/audit/report.md` before planning — it is the current priority list, and
note that two findings (F-001, F-003) carry corrections that downgraded them.

---

## Next

1. **A throwaway Supabase project.** Listed for a long time as the CI blocker,
   but it is worth more than that: today every verification run writes to the
   same database production uses, the suites only execute when somebody
   remembers, and two migrations had to be hand-pasted because no agent can
   safely touch the live schema. This unblocks the next three items at once.
2. **CI on pull request** — `npm ci`, `tsc --noEmit`, `lint`, `build`,
   `npm audit --audit-level=high`. **None of these need a database**, so this
   can land before item 1; the suites join once the throwaway project exists.
   Then protect `main` (audit F-008).
3. **Rate limit `/c/[slug]`** before a real QR code is on a real table. It is
   the only public write path and has no throttle, honeypot or format check,
   and junk capture lands in the ledger's denominators (audit F-006).
4. **Resend account.** No nurture email has ever actually been sent. Largest
   untested surface, and the only one that touches a stranger's inbox. Cannot be
   rehearsed on the demo agency — `send.ts` refuses demo tenants (ADR-010). Note
   the send path now emits `List-Unsubscribe-Post`, so one-click unsubscribe
   should be checked against a real Gmail message.
5. **Finish proving production** — the two things a terminal can't check:
   - [ ] Sign in at `porchlightfostercare.org/login` and confirm the emailed
         link resolves (delivery, not just link generation)
   - [ ] Scan a printed QR from a phone on mobile data; contact lands on `/board`
   - [ ] Tap the hamburger on a real phone. Verified at ~700px in a desktop
         window, never on a device.
6. **Design-partner onboarding.** Seed their sources, backfill known licensed
   homes, set their counties on `/arizona`.
7. **Playwright e2e** (event → QR capture → board → stage change) and the
   throttled-3G check on `/c/[slug]`.

## Arizona data upkeep

Refresh twice a year, by hand — `dcs.az.gov` 403s every server-side fetcher, so
a human with a real browser is part of the pipeline.

1. Download both workbooks into `az_docs/` (gitignored) — links and tab layout
   in `docs/az-data-sources.md`.
2. `node scripts/az-stats-import.mjs` to see the diff.
3. `node scripts/az-stats-import.mjs --apply` to write it.

Update the filename and `az_stat_source` title constants at the top of the
script when the reports change edition.

## Applying migrations

Both 0011 and 0012 are applied and verified. For the next one:

**Paste it into the Supabase SQL editor. Do not use `supabase db push`.** Push
applies everything absent from `supabase_migrations.schema_migrations`, and
because every migration here was pasted by hand rather than run through the CLI,
that table is empty. A push would try to re-run `0001` onward, and those are
forward-only and not idempotent. If CLI pushes are ever wanted, backfill history
first with `supabase migration repair --status applied` for each existing file.

Write new migrations **re-runnable** (`drop ... if exists`, `create or replace`),
because a hand-paste that half-fails gets pasted again. 0011 and 0012 are; the
earlier ones are not.

**Never merge code that depends on an unapplied migration** — `/ledger` was down
on `main` for a stretch because the page called RPCs that did not exist yet.

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

- [ ] The inbound webhook matches by `ilike` across every tenant with no `agency_id` filter, so a reply from someone in two agencies' lists can land in the wrong one, in an append-only table (audit F-007)
- [ ] No error reporting and no cron heartbeat; a dead tick looks like a quiet week (audit F-011)
- [ ] `.gitignore`'s `.env*` excludes `.env.example`, so a fresh clone can't follow README step 2 (audit F-009, one line)
- [ ] `sendNurtureEmail` is email-shaped at every seam while ADR-003 records the layer as channel-agnostic; build the seam before the Twilio registration clears, not after (audit F-014)
- [ ] `createAdminClient` is a bare factory with no rule about who may call it; enforce ADR-013's invariant with an eslint `no-restricted-imports` (audit F-012 follow-up)
- [ ] A send that crashes mid-flight leaves a `sending` row that never retries (deliberate: prefers a missed email to a double-send)
- [ ] Board has no drag-and-drop; per-card `<select>` is the mechanism
- [ ] Board caps at 2,000 cards. Visible on the page, but a real fix is windowing
- [ ] Suites aren't in CI — needs a throwaway Supabase project
- [ ] Invitations aren't emailed; the recruiter copies the link and sends it themselves
- [ ] `delete_demo_data()` doesn't clear `agency_county`, `agency_target` or `agency_invite` — `seedDemoAgency` clears them itself, so a rebuild is still identical, but "empty it out" leaves them behind
- [ ] Onboarding progress is only reachable from a contact's page; there is no "who's in onboarding" list
- [ ] eslint 9 → 10 migration clears 9 dev-only advisories; ordinary maintenance, not security (audit F-001)

### Closed by the audit (2026-07-26)

- ~~`/ledger` aggregates in TypeScript over every contact~~ — moved to `ledger_rows()` in 0012. It was filed as a performance item; the real defect was silent under-reporting past 1000 rows (F-002)
- ~~No way to add a contact outside an event~~ — `/contacts/new` with a required source picker
- ~~Sources can never be deleted~~ — delete on the event page, refused once anyone was captured
- ~~Unusable on a phone~~ — hamburger nav, swipeable board, card layouts
- ~~`role` was self-editable~~ — trigger in 0011 (F-003, ADR-013)
- ~~Unsubscribe opted people out on GET~~ — asks on GET, writes on POST, RFC 8058 one-click endpoint (F-004)
- ~~Service-role client on a public route~~ — `public_unsubscribe()` in 0011 (F-012)
- ~~System endpoints accepted `"Bearer undefined"`~~ — `verifySystemSecret()` (F-005)
- ~~No release tag~~ — `v0.6.0` (F-016)

### Closed by M5

- ~~Onboarding creates one agency per user via the service role~~ — replaced by
  `create_agency()` in 0009 (ADR-012)
