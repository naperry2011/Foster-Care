# Tasks

Active work. Update as items are completed and new work is identified.

## Sprint / Iteration

**Range:** post-MVP, pre-pilot
**Goal:** Get the app running against a live Supabase project and rehearse the pilot flow.

## In Progress

- (nothing in flight)

## Up Next

- [ ] Create Supabase project; run `supabase/migrations/0001_schema.sql` + `0002_warmth.sql`; replace placeholders in `.env.local` — **Perry** (requires his account)
- [ ] End-to-end smoke test: sign in → onboarding → event → QR capture → quick-add → board stage moves → licensed → ledger row
- [ ] Set Vercel env vars (`NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`, later `RESEND_API_KEY`/`EMAIL_FROM`/`CRON_SECRET`/`INBOUND_WEBHOOK_SECRET`)
- [ ] RLS isolation test (two seeded agencies, cross-access must fail) — medium
- [ ] Playwright e2e for the capture flow — medium
- [ ] Send-layer tests: consent block, opt-out irreversibility, idempotent double-fire — small

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
