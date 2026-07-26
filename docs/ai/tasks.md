# Tasks

Active work. Update as items are completed and new work is identified.

## Sprint / Iteration

**Range:** Milestone 4 — Pilot readiness (planned 2026-07-26)
**Goal:** App runs live end-to-end, deployed, pilot agency onboardable.

## In Progress

- (nothing in flight)

## Milestone 4 phases

**Phase A — Go live** (blocker: Perry's accounts)
- [ ] Perry: create Supabase project; run migrations 0001 + 0002; fill `.env.local` with real values
- [ ] Full local smoke test: sign in → onboarding → event → QR capture → quick-add → stage moves → licensed→outcome → ledger → manual cron tick → unsubscribe
- [ ] Fix whatever the first live run surfaces

**Phase B — Prove the invariants** (after A)
- [ ] RLS isolation test: two seeded agencies, zero cross-visibility — medium
- [ ] Send-layer tests: consent block, opt-out irreversible, idempotent double-fire — small
- [ ] Playwright e2e capture flow; throttled-network check on `/c/[slug]` (<1s) — medium

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

- [ ] StageSelect uses `prompt()` for wake-up dates — replace with a proper date picker
- [ ] Onboarding creates one agency per user; no invitations/teammates yet
- [ ] `contact.wake_up_on` update in `moveStage` happens outside the RPC (two round-trips)
