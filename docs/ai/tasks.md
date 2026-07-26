# Tasks

Active work. Update as items are completed and new work is identified.

## Sprint / Iteration

**Range:** Milestone 4 — Pilot readiness (planned 2026-07-26)
**Goal:** App runs live end-to-end, deployed, pilot agency onboardable.

## In Progress

- (nothing in flight)

## Milestone 4 phases

**Phase A — Go live**
- [x] Perry: create Supabase project; run migrations 0001 + 0002; fill `.env.local` — 2026-07-26
- [x] Full live run: sign in → onboarding → event → QR capture → stage moves via UI → board/contacts/tasks/ledger → cron tick — 2026-07-26
- [x] Fix what the first live run surfaced: undeletable contacts, dateless waiting room, unretryable failed sends, ledger copy bug — 2026-07-26
- [x] Perry: run `0003_erasure.sql` — applied, verified — 2026-07-26
- [x] Purge leftover test agencies (`scripts/purge-test-agencies.mjs`) — 2026-07-26
- [ ] **Perry: run `supabase/migrations/0004_erasure_authz_fix.sql`** — SECURITY: until then anyone with the public anon key can erase any contact
- [ ] Re-run all three scripts after 0004 (expect smoke 32, cron 9, anon-audit 0 exposed)

**Phase B — Prove the invariants**
- [x] RLS isolation test: two agencies, zero cross-visibility — `scripts/smoke-test.mjs` — 2026-07-26
- [x] Send-layer tests: consent block, opt-out irreversible, dedupe, no-send-to-unconsented — 2026-07-26
- [x] Cron behavior tests: wake-ups, cold flags, once-only — `scripts/cron-test.mjs` — 2026-07-26
- [x] Anonymous attack-surface audit — `scripts/anon-audit.mjs`; found the anon erasure hole — 2026-07-26
- [ ] Playwright e2e capture flow; throttled-network check on `/c/[slug]` (<1s) — medium
- [ ] Wire both scripts into CI once a hosted test project exists — small

**Phase C — Deploy** (after A)
- [ ] Perry: Vercel project + env vars (`NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`=prod, `CRON_SECRET`, `INBOUND_WEBHOOK_SECRET`)
- [ ] Verify prod flow, cron firing, QR codes point at prod URL
- [ ] Perry (when email goes live): Resend account + verified domain → `RESEND_API_KEY`/`EMAIL_FROM`

**Phase D — Pilot onboarding** (after C, needs signed agency)
- [ ] Onboard design partner: seed sources, backfill licensed homes, import contacts
- [ ] Saturday rehearsal: printed QR, 5 phone captures, board-ready ledger export

**Out of M4:** Twilio/A2P (needs business entity), Spanish, Binti handoff.

## Blocked

- [ ] Twilio A2P 10DLC registration — needs a legal business entity/EIN

## Recently Completed

- [x] M0 foundation (schema, RLS, auth) — 2026-07-26
- [x] M1 capture (events, QR, capture page, quick-add, board) — 2026-07-26
- [x] M2 warmth (send layer, nurture, waiting room, cron, webhook) — 2026-07-26
- [x] M3 ambassadors + attribution ledger + backfill — 2026-07-26
- [x] Public landing page + storybook redesign + no-env deploy hardening — 2026-07-26

## Bugs

- (none known — nothing has run against a live DB yet)

## Tech Debt

- [x] StageSelect `prompt()` → inline date picker — 2026-07-26
- [x] `wake_up_on` now rides along inside `set_contact_stage` (one round-trip) — 2026-07-26
- [ ] Onboarding creates one agency per user; no invitations/teammates yet
- [ ] A send that crashes mid-flight leaves a `sending` row that never retries (deliberate: prefers a missed email over a double-send). Revisit with a stale-claim sweeper if it bites.
- [ ] No UI for erasure yet — `delete_contact()` exists but nothing calls it; add a "Delete this person" action on the contact row
- [ ] Cron loops contacts in TypeScript; fine at pilot scale, revisit ~10k contacts
