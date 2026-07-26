# Project Memory

Running history of what's been built and current state. Update after major changes.

## Current State

**Status:** Active Development (MVP running live against Supabase; M4-A in progress)
**Last Updated:** 2026-07-26
**Version:** main

### What's Working
- Live Supabase project wired up (`ygryunmvgyuqjxkumbmu`); migrations 0001 + 0002 applied
- Verified end-to-end against the real database: magic-link sign-in, agency onboarding, event + QR creation, public capture, stage moves through the UI, board/contacts/tasks/ledger all rendering real data
- `scripts/smoke-test.mjs` — 24 assertions green: immutable attribution, append-only history, stage RPC enforcement, consent, opt-out irreversibility, send dedupe, and full two-tenant RLS isolation
- `scripts/cron-test.mjs` — 9 assertions green: wake-ups, cold flags, once-only task creation, no sends to unconsented/opted-out contacts
- `scripts/anon-audit.mjs` — 17 checks, 0 exposed: every table denies anonymous reads and writes; only `public_capture` is reachable without a session
- Deploys to Vercel without env vars (landing renders; middleware degrades gracefully)

### Known Issues
- No Resend key yet, so nurture emails are skipped (by design, not an error) — nothing has verified a real email send end-to-end
- Playwright e2e and the throttled-3G capture-page check still unwritten; scripts aren't in CI (needs a separate test project)
- No UI for erasure yet — `delete_contact()` exists and is tested, but nothing in the app calls it
- No Resend key yet, so nurture emails are skipped (by design, not an error)
- Playwright e2e and the throttled-3G capture-page check still unwritten
- Browser-pane screenshots time out on this machine (pages render fine; tooling quirk)

### In Progress
- M4-A complete. Migrations 0001–0004 applied; all three suites green (smoke 32/32, cron 9/9, anon-audit 17 safe / 0 exposed); UI verified against live data including the new inline wake-up picker. Next: M4-C (Vercel env + prod deploy).

## Implementation History

### 2026-07-26 - MVP Milestones 0–3 (single session)
**What was built:** Entire MVP per docs/PLAN.md — foundation/schema/RLS (b889467), capture (79a6417), warmth/nurture (6cb8bb7), ambassadors + ledger (c43dded), README (80375eb), landing page (258dd9a), storybook redesign (389939d), env hardening (d17a6d9).
**Why:** 90-days-to-paid-pilot plan from the Porchlight build spec; Perry approved a milestone-based (not day-based) plan.
**Files affected:** everything — greenfield repo.

### 2026-07-26 - First live run: four defects found and fixed
**What was built:** `scripts/smoke-test.mjs`, `scripts/cron-test.mjs`, `scripts/dev-session.mjs`, migration `0003_erasure.sql`.
**Why:** Nothing had ever run against a real database. Driving the real flow surfaced four bugs that no amount of building would have:

1. **Nobody could be deleted, ever.** The append-only triggers on `touch`/`stage_change` rejected the DELETE cascade, so `delete from contact` always failed. "Please delete my information" was unanswerable and a typo'd contact was permanent. Fixed in 0003: deletion flows through a `delete_contact()` RPC that opens a one-shot GUC gate — history still can't be rewritten, but a person can be erased whole.
2. **A contact could enter the waiting room with no wake-up date.** The UI asked for the date in a dismissible `prompt()`; hitting Cancel (or any browser that blocks `prompt()`) dropped the person into the graveyard the product exists to eliminate. Fixed in two layers: an inline date picker in `StageSelect`, and a database default of +1 year in `set_contact_stage()` so the clock always exists.
3. **A failed email was never retried, and one failure burned every remaining step.** `sendNurtureEmail` claimed the dedupe key then marked it `failed` on error, so the unique constraint blocked all future attempts; the cron loop only broke on success, so a single failure consumed all of that contact's remaining templates in one tick. Fixed: the claim is released on failure, nothing is claimed when no provider is configured, and the loop stops on failure.
4. **"0 of 1people"** on the ledger — the JSX transform stripped the space after an expression at a line break. Fixed with an explicit `{" "}`.

**Files affected:** `src/lib/send.ts`, `src/app/api/cron/tick/route.ts`, `src/components/StageSelect.tsx`, `src/app/contacts/actions.ts`, `src/app/ledger/page.tsx`, `supabase/migrations/0003_erasure.sql`, `scripts/`.

## Architecture Evolution

Next.js 15 App Router monolith on Vercel; Supabase (Postgres + RLS + Auth) as the only backend; Resend for email; daily Vercel cron drives all automation. See architecture.md.

## Lessons Learned

- Enforce product invariants (consent, immutability, append-only) in Postgres triggers/RPCs, not app code — the schema is the spec.
- …but an invariant with no escape hatch becomes a bug. "Append-only" quietly meant "undeletable", which is a compliance problem for PII. Every immutability rule needs a deliberate, audited way out.
- A dialog the user can dismiss is not a required field. `prompt()` returning null silently produced exactly the outcome the product exists to prevent.
- Claim-before-send gives idempotency, but the claim must be *released* on failure or a transient outage becomes permanent data loss.
- Building against placeholder credentials hides whole classes of defects. The first hour against a real database found four bugs; the previous eight hours of building found none.
- In Supabase, **every new function in the public schema is granted to `anon` by default**, and `revoke ... from public` does not remove it — revoke `anon` by name. A fix (0003's erasure RPC) shipped a worse hole than the bug it closed, and only a test caught it.
- "Trust a null `auth.uid()` so system scripts can bypass" is never safe: anonymous callers have a null uid too. Give scripts a real identity instead.
- create-next-app refuses capitalized dir names ("Foster-Care"); scaffold in a temp dir and move.
- Console noise on deployed sites is usually browser extensions (Affirm, wallets), not the app.
