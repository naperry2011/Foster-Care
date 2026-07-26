# Project Memory

Running history of what's been built and current state. Update after major changes.

## Current State

**Status:** Active Development (MVP complete, pre-pilot)
**Last Updated:** 2026-07-26
**Version:** main @ d17a6d9

### What's Working
- Full MVP builds clean: capture (events/QR/quick-add), stage board, contacts, waiting room, email nurture engine, ambassadors, attribution ledger, warm storybook landing page at `/`
- Schema with enforced invariants (immutable source, append-only logs, RLS) in `supabase/migrations/`
- Deploys to Vercel without env vars (landing renders; middleware degrades gracefully)

### Known Issues
- `.env.local` contains **placeholder** Supabase values — sign-in and all authed pages untested against a live database
- RLS isolation tests, Playwright e2e, and send-layer tests from docs/PLAN.md's verification section are not yet written
- Browser-pane screenshots time out on this machine (page renders fine; tooling quirk)

### In Progress
- Nothing in flight. Next session: create Supabase project, run migrations, test end-to-end.

## Implementation History

### 2026-07-26 - MVP Milestones 0–3 (single session)
**What was built:** Entire MVP per docs/PLAN.md — foundation/schema/RLS (b889467), capture (79a6417), warmth/nurture (6cb8bb7), ambassadors + ledger (c43dded), README (80375eb), landing page (258dd9a), storybook redesign (389939d), env hardening (d17a6d9).
**Why:** 90-days-to-paid-pilot plan from the Porchlight build spec; Perry approved a milestone-based (not day-based) plan.
**Files affected:** everything — greenfield repo.

## Architecture Evolution

Next.js 15 App Router monolith on Vercel; Supabase (Postgres + RLS + Auth) as the only backend; Resend for email; daily Vercel cron drives all automation. See architecture.md.

## Lessons Learned

- Enforce product invariants (consent, immutability, append-only) in Postgres triggers/RPCs, not app code — the schema is the spec.
- create-next-app refuses capitalized dir names ("Foster-Care"); scaffold in a temp dir and move.
- Console noise on deployed sites is usually browser extensions (Affirm, wallets), not the app.
