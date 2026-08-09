# Porchlight MVP — Milestone Plan

## Context

Porchlight is a pre-inquiry recruitment platform for Arizona private foster-care licensing agencies. Arizona lost ~62% of licensed foster homes (2017–2025); incumbents (Binti, Casebook, CCWIS) all start at the application, leaving everything upstream — event capture, "not yet" nurture, source attribution — unowned. The build spec (Porchlight-Build-Spec.pdf) defines a 6-stage pre-inquiry model, 5 MVP modules, a data model, and architecture. The repo `Foster-Care` is empty (git initialized, no commits). Goal: an MVP a real recruiter can use at an event, culminating in a paid design-partner pilot.

**Decisions made with user:**
- Stack: Next.js (App Router) + TypeScript + Tailwind, Supabase (Postgres + RLS + Auth), Vercel.
- Milestone-based plan (not calendar days).
- Email-first messaging (Resend or Postmark); send layer is channel-agnostic so Twilio SMS slots in later once A2P 10DLC clears. No SMS blocker on the pilot.

**Guiding principles (from spec, settle all scope arguments against these):**
1. Capture beats qualify — one field (phone or email), ten seconds.
2. `not_yet` is a first-class status with a wake-up date, not a rejection.
3. Source attribution is immutable, written at contact creation. No orphan contacts, ever.
4. Never touch the system of record — no case data, no child data, hand off at inquiry.

---

## Milestone 0 — Foundation
**Ship: a deployed, multi-tenant, authenticated skeleton.**

- Scaffold Next.js + TS + Tailwind; deploy to Vercel from first commit.
- Supabase project; Supabase Auth (email magic link is fine for pilot).
- Schema (from spec §05), every table carries `agency_id`:
  - `agency`, `user` (agency-scoped)
  - `source` — id, kind (`event|ambassador|digital|partner|walk_in`), name, cost_cents, hours_invested, occurred_on, location
  - `contact` — **`source_id` NOT NULL, immutable** (enforce via trigger), captured_by, phone/email (at least one, CHECK constraint), name optional, stage enum (`unaware|curious|considering|not_yet|inquiry|licensed|declined`), `wake_up_on` date, `consent_sms`, `consent_email`, `opted_out_at`, `referred_by_contact_id`
  - `touch` — append-only interaction log (direction, channel, body, sequence_id)
  - `stage_change` — **append-only**; contact.stage updated only via a function that also writes this row
  - `outcome` — licensed_on, first_placement_on, confirmed_by
- RLS policies on every table scoped by agency; **write a test proving two agencies can't see each other's rows** (RLS tested, not assumed).
- PII: encrypt at rest (Supabase default) + an access-log pattern for contact reads.

**Done means:** two seeded agencies coexist with zero leakage; deployed URL with login.

## Milestone 1 — Capture
**Ship: a recruiter can stop losing people at an event.**

- Event/source creation from a phone in <30s; generates a per-event QR code + short link.
- Public capture page (`/c/[slug]`): one field (phone or email), name asked second, consent checkbox, <1s load on bad connection (static/edge, minimal JS), thumb-friendly.
- Recruiter quick-add: big-button contact creation in <5s while standing at a table.
- Contact list + six-stage board with `not_yet` as a parallel holding lane; stage moves via drag/tap write `stage_change`.
- Every contact visibly shows its source; creating an unattributed contact is impossible.

**Done means:** end-to-end demo — create event → scan QR → submit → contact appears on board with source stamped.

## Milestone 2 — Warmth (waiting room + nurture, email-first)
**Ship: nobody goes cold and nobody gets forgotten.**

- Consent enforced **at the send layer**: no send without the channel's consent flag; opt-out (unsubscribe link) is logged and irreversible; every send idempotent + rate-limited.
- Email nurture sequences keyed to **stage** (not calendar) via Resend/Postmark: eligibility check, cost explainer, "a week in the life," licensing timeline. Channel-agnostic `send()` abstraction so SMS is a drop-in later.
- Waiting room: `wake_up_on` drives a scheduled job (Supabase cron / pg_cron + Vercel cron) that creates a re-engagement task when the date arrives — must survive deploys (dates live in the DB, not in-process timers).
- Quarterly cadence rule for `not_yet` contacts; cold-flag detection for contacts silent mid-`considering`.
- Reply detection (inbound email webhook): any human reply pauses automation and creates a task.

**Done means:** a `not_yet` contact with a wake-up date resurfaces automatically; a reply halts its sequence.

## Milestone 3 — Ambassadors + Attribution Ledger
**Ship: the screen that closes the sale.**

- Ambassador personal share links; referral chains via `referred_by_contact_id`; one-screen ambassador view (reached / still considering).
- Attribution ledger (the reason anyone pays):
  - Cost per licensed home, by source, across the full lag window.
  - Event-level ROI row: captured → still warm → inquiries → licensed, median lag.
  - Waiting-room yield: % of `not_yet` that converted and how long they took.
  - Leading indicators from week one (captures, warm contacts, inquiry rate) since licensing lag is 12–24 months.
  - **Outcome backfill**: onboarding flow to import known past licensed homes so the ledger isn't empty on day one. Outcome confirmation is manual (one click/month) — no Binti API in MVP; CSV export for handoff.
  - One board-ready export (print-stylesheet page or PDF).
- First-touch attribution only; later touches visible in the timeline. No attribution modeling.

**Done means:** the sample ledger table from the landing page can be produced from real data.

## Milestone 4 — Pilot readiness
- Onboard the design-partner agency: seed sources, backfill outcomes, import any existing contact list (with source guesses).
- File Twilio A2P 10DLC when a business entity exists (4–8 wk lead time); then add SMS to the send layer + text-in keyword capture (v1.1).
- Deferred by design: Binti API handoff (v1.1, when partner asks), Spanish-language capture/nurture (v1.1 — design copy strings for i18n now), retention pulse & multi-agency rollup (v2).

## Milestone 5 — Client-ready
**Ship: a platform an Arizona recruitment director sees as a product, not a prototype.**

Added after M0–M3 shipped. The MVP worked; it did not yet *look* finished, and
it could not argue for itself in a room before the agency's own data existed.

- App shell, sign-out, settings, error/loading states — and the bug sweep that
  came with driving every screen (0005).
- Contact detail with a merged interaction timeline. The `touch` rows written
  since M2 had never been displayed anywhere.
- A shared design vocabulary in `src/components/ui/` so the signed-in app reads
  like the landing page. `Cited` cannot render a public figure without its
  source — provenance enforced by the type system (ADR-011).
- A demo agency in its own tenant: 18 months of invented history, rebuildable
  identically in one click, unemailable by construction (0006, ADR-010).
- **`/arizona`** — the state's own numbers, each with publisher, link and
  as-of date, plus the agency's goals in a physically separate table (0007,
  ADR-009). Ingest is a human running a script twice a year; `dcs.az.gov`
  refuses every server-side fetcher.
- **Onboarding progress** — a parallel `journey` record for a family at
  `inquiry`, prompting but never performing "mark licensed" (0008, ADR-008).
- **Teammates** — invitations, and both join paths moved off the service-role
  key onto security-definer RPCs (0009, ADR-012).

**Done means:** five suites green against the live database, and a demo that
tells the whole story from a cold start. Merged to `main` 2026-07-26.

---

# The design partner, and what it changed

M0–M5 were built against a spec. Everything below is built against an agency.

**The Greenhouse** — an Arizona licensing agency focused on Tucson — became a
design partner in August 2026 and sent back a landscape brief on Arizona's foster
care system plus a set of DCS figures. Their own internal outreach pilot starts
in **October 2026**, with the full loop in scope, nurture email included.

Three things in that brief moved the plan:

1. **DCS does not want more homes. It wants five specific kinds of home** — kin,
   racially and culturally matched, sibling groups, older youth, and medically
   complex or therapeutic. `contact` has nineteen columns and none of them
   describe the family, so `ledger_rows()` groups by exactly one dimension:
   `source.id`. A source that produced three therapeutic homes and one that
   produced three respite-only homes are identical on the screen that closes the
   sale.
2. **Kinship is the largest opportunity and 0007 explicitly excluded it**,
   annotating 2,193 unlicensed kinship homes as "not a recruitment pipeline".
   That annotation is wrong. It is not recruitment, it is conversion: the family
   already has the child, licensing takes 60–90 days, and it roughly doubles what
   they receive.
3. **The ledger can finally argue in dollars.** Agencies receive $1,250 per newly
   licensed family on first placement and $1,000 for a congregate step-down.
   Every money column in the schema is an outflow, and
   `outcome.first_placement_on` — the exact trigger for the $1,250 — has been
   declared since 0001 and written by nothing.

Their answer is `docs/az-priorities.md`. The milestones below are sequenced
backwards from October.

## Milestone 6 — Pilot-safe
**Ship: a system fit to hold a real agency's families.**

Every item either has external lead time or gates the collection of real PII.

- **Resend account and verified domain — the one item with no slack.** The pilot
  includes nurture email; nothing has ever reached an inbox. DNS and sending
  reputation do not compress.
- Privacy policy, data-processing agreement, retention period, subject-access
  path. `delete_contact()` is the mechanism; this is the policy around it.
- Rate limit `/c/[slug]` and widen capture slugs, before a printed QR is on a
  table.
- Fix the inbound webhook's cross-tenant match — theoretical with one tenant,
  real with two.
- A throwaway Supabase project; secrets out of Dropbox; CI on pull request; then
  protect `main`.
- Cron heartbeat and error reporting. A dead tick currently looks exactly like a
  quiet week.

**Done means:** a real nurture email delivered to a real inbox, and no path to a
real agency's data that verification also writes to.

## Milestone 7 — Pima-ready
**Ship: their actual goal, expressible and measured.**

Migration 0013, and the narrowest schema change that does it.

- County and postal code on a contact. Contacts carry no location at all today,
  so the ledger cannot answer "how many homes in Pima?" Deliberately not added to
  `az_geo`, which mirrors what Arizona publishes and publishes nothing by ZIP
  (ADR-009).
- `contact_profile` — capacity, sibling groups, age range, placement types.
  Optional, `on delete cascade`, and the vocabulary comes from their team rather
  than from us. Demographic columns are added to this same table in M10, behind
  M6's privacy work.
- `caregiver_kind` (`community | kin`) — two lines, shipped now so kin families
  captured in October are tagged from day one rather than sorted out by hand
  later. Deliberately not a new `contact_stage` value (ADR-008).
- `agency_target` gains a geography and a metric, so "120 beds in Pima" fills in
  instead of sitting there as text.
- **Homes lead, beds shown alongside.** Beds are summed from recorded capacity,
  never homes × the statewide 2.2, and the screen says how many are unrecorded.

**Done means:** a director opens `/arizona` and sees their Tucson target as a
number moving, and the capture page still takes ten seconds.

## Milestone 8 — The October pilot
**Ship: the five paths that have never run.**

QR scanned from a real phone; an email delivered; a reply received and automation
paused; a wake-up fired for a real person; a ledger with real outcomes in it.
Each has an audit finding sitting on it, and all five run for the first time in
front of real families.

Onboard before the date, not during: their sources seeded, their existing
licensed homes backfilled, Pima set, the 120 target set, their recruiter walked
through `/tasks`. Design the feedback collection beforehand — they offered it.

**Done means:** thirty people captured who would otherwise have evaporated, and a
defect list worth more than any feature.

## Milestone 9 — The kinship conversion funnel
Migration 0014. A kinship journey catalog against the Gold Standard 60–90 day
timeline; kinship messaging, because the current templates persuade someone who
has never considered fostering and would be wrong sent to a grandmother whose
grandchildren are already asleep upstairs; stage labels that vary by kind; board
and ledger separation, because the two funnels have genuinely different lags and
economics. Deferred past the pilot deliberately — the tag has been live since
October, so this starts with real data rather than a guess.

## Milestone 10 — Demographics and language
Sensitive columns on `contact_profile`: language, race and ethnicity
(multi-select), tribal affiliation. Optional, self-reported, never inferred.
Gated on M6. Unblocks Spanish capture, overdue since M4.

## Milestone 11 — The economics ledger
Migrations 0015–0016. Write `first_placement_on` at last; incentives on
`outcome`; published DCS rates in `az_stat` with citations, kept apart from the
agency-editable defaults used in arithmetic (ADR-009); `ledger_rows()` v2 with
revenue and a split by caregiver kind. Columns added to existing per-source rows
rather than new grouping dimensions, so `ledger-parity` still proves nothing
moved (ADR-014).

## Milestone 12 — The pitch surface
`/arizona` gains a DCS priorities view. Demo agency reseeded to tell the kinship
and incentive story. `docs/overview.md`, `workflow.md` and `training.md`
refreshed — all three describe a single stranger-recruitment funnel and go stale
the moment M9 lands.

---

## Deliberately NOT building (spec §02)
Home-study/licensing workflow, case management, anything touching child data, caregiver-facing family app, group-home compliance tooling.

**Where the design partner's brief will test this fence.** It covers congregate
care, QRTP accreditation, judicial oversight and specialized group-home cohorts
in detail. All of that is context, not scope. Concretely: the congregate
step-down incentive in M11 is a boolean on **the home's** outcome and never a
record about a child; nothing in M9's kinship work touches the placement itself;
and no amount of QRTP detail in a client document makes group-home compliance
ours. Every gravity in this market pulls toward the application, because that is
where the incumbent budget sits. The refusal is what makes the product legible.

## Verification
- RLS isolation test suite (two tenants, cross-access attempts fail) — run in CI.
- Playwright e2e: event → QR capture → board → stage change → stage_change row exists.
- Send-layer tests: no-consent send blocked, opt-out irreversible, idempotency (double-trigger sends once).
- Lighthouse/throttled-3G check on the capture page (<1s target).
- Manual pilot rehearsal: run a fake "event" on a phone, capture 5 contacts, produce the ledger export.

## Repo start
Empty repo → initial commit is the scaffolded app + `supabase/migrations/0001_schema.sql` + this plan as `docs/PLAN.md`.
