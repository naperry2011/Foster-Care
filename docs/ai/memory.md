# Project Memory

Running history of what's been built and current state. Update after major changes.

## Current State

**Status:** Active Development — Milestone 5 (Client-ready), slices A–D done, E–H remaining
**Last Updated:** 2026-07-26
**Version:** branch `m5-client-ready`
**Deployed:** Vercel (landing + app). Supabase project `ygryunmvgyuqjxkumbmu`, migrations 0001–0006 applied.

### What's Working
- **The whole MVP, live**: capture → waiting room → nurture → ambassadors → attribution ledger, verified against the real database.
- **App shell** with navigation, account menu, sign-out, agency settings, error/loading/not-found at both root and app level. All authed pages live in the `(app)` route group under one layout.
- **Contact detail + timeline** (`/contacts/[id]`): merged touches, stage changes, sends and tasks; manual conversation logging; notes; erasure UI wired to `delete_contact`.
- **Search and pagination** on `/contacts`; every contact reference across the app is a link.
- **Design system** in `src/components/ui/` — the signed-in app now shares the landing page's storybook vocabulary (Fraunces headings, Caveat asides, warm empty states). Print stylesheet for the ledger export.
- **Demo agency**: `demo@porchlight.demo` / `PorchlightDemo!2026` — 269 contacts, 11 sources, 23 licensed homes over 18 months, rebuildable identically in one click. The ledger tells its own story (ambassadors ≈1 staff-hour per home, paid social $9,400/home, radio 0 homes).
- **Five suites green**: smoke 32/32, cron 10/10, anon-audit 19 safe / 0 exposed, demo-test 5/5, plus `purge-test-agencies`.

### Known Issues
- No Resend key, so nurture emails are skipped by design — no real send has ever been verified end to end.
- Playwright e2e and the throttled-3G capture-page check still unwritten; suites aren't in CI (needs a separate test project).
- `/ledger` still aggregates in TypeScript over every contact; fine at 269, revisit past ~1,000.
- **Browser-pane quirk, not a bug:** the preview pane runs with `visibilityState: "hidden"`, so `requestAnimationFrame` never fires and React's Suspense reveal never completes — pages look stuck on "Loading…" and screenshots time out. Flush manually with `window.$RV(window.$RB)` in the console. Real browsers are unaffected.
- JSX in this setup strips the space after an expression at a line break (`{n} people` → "5people"). Bitten twice; use an explicit `{" "}`.

### In Progress
- Milestone 5, slice E (Arizona data dashboard) is next. **Blocked on a human step:** `dcs.az.gov` returns 403 to server-side fetchers, so the two source workbooks must be downloaded in a real browser before the county data can be modelled.

## Implementation History

### 2026-07-26 - Milestone 5 slices A–D (client-ready)
**What was built:** the polish and proof that turn a working MVP into something you can sell from.
- **A — App shell & bug sweep** (0005): `(app)` route group, AppShell + AccountMenu with the sign-out button the product never had, `/settings`, error/loading/not-found, OG image, `middleware.ts` → `proxy.ts`. Fixed three real bugs: waking a contact NULLed `wake_up_on` so the board cried "no wake-up date!" at every woken contact; `outcome_confirm` tasks were never created, so the habit the whole ledger depends on had nothing prompting it; quick-add wrote contact + history from app code instead of one transactional RPC. Added `agency_update` RLS policy — renaming an agency would have failed silently.
- **B — Contact detail & timeline**: the `touch` rows written since M2 had never been displayed anywhere. Merged timeline, manual conversation logging, erasure UI, search, pagination.
- **C — Design system**: `src/components/ui/` (Panel, PageHeader, StatTile, EmptyState, Pill, SectionNote, Cited). `Cited` requires its `source` prop at the type level, so a public figure cannot render without attribution. Print stylesheet.
- **D — Demo agency** (0006): `agency.is_demo`, `delete_demo_data()` that refuses non-demo agencies, fixed-seed generator, and a hard block in `send.ts` so a demo agency can never be emailed.

**Why:** owner needed the platform presentable to real Arizona agencies — "we have the plate but we must flesh it out."
**Files affected:** `src/app/(app)/**`, `src/components/ui/**`, `src/lib/demo/**`, `src/lib/timeline.ts`, migrations 0005–0006, `scripts/demo-*.mjs`.

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
