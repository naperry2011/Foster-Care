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

---

## Deliberately NOT building (spec §02)
Home-study/licensing workflow, case management, anything touching child data, caregiver-facing family app, group-home compliance tooling.

## Verification
- RLS isolation test suite (two tenants, cross-access attempts fail) — run in CI.
- Playwright e2e: event → QR capture → board → stage change → stage_change row exists.
- Send-layer tests: no-consent send blocked, opt-out irreversible, idempotency (double-trigger sends once).
- Lighthouse/throttled-3G check on the capture page (<1s target).
- Manual pilot rehearsal: run a fake "event" on a phone, capture 5 contacts, produce the ledger export.

## Repo start
Empty repo → initial commit is the scaffolded app + `supabase/migrations/0001_schema.sql` + this plan as `docs/PLAN.md`.
