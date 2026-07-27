# Project Memory

Running history of what's been built and current state. Update after major changes.

## Current State

**Status:** Active Development — M5 complete; engineering audit done and its Horizon 1 closed
**Last Updated:** 2026-07-26
**Version:** `main` @ `9d4e860`, tagged **`v0.6.0`**
**Deployed:** **https://porchlightfostercare.org** (Vercel). Apex serves Production, `www` 308s to it. Supabase project `ygryunmvgyuqjxkumbmu`, migrations **0001–0012** applied.

### What's Working
- **The whole MVP, live**: capture → waiting room → nurture → ambassadors → attribution ledger, verified against the real database.
- **App shell** with navigation, account menu, sign-out, agency settings, error/loading/not-found at both root and app level. All authed pages live in the `(app)` route group under one layout.
- **Contact detail + timeline** (`/contacts/[id]`): merged touches, stage changes, sends and tasks; manual conversation logging; notes; erasure UI wired to `delete_contact`.
- **Search and pagination** on `/contacts`; every contact reference across the app is a link.
- **Design system** in `src/components/ui/` — the signed-in app now shares the landing page's storybook vocabulary (Fraunces headings, Caveat asides, warm empty states). Print stylesheet for the ledger export.
- **Arizona dashboard** (`/arizona`): statewide headlines, county entries-into-care, agency goals. Every figure carries publisher, link and as-of date; unpublished grains are stated in words. Loaded by `scripts/az-stats-import.mjs` from two DCS workbooks (`az_docs/`, gitignored) — human-run twice a year.
- **Onboarding progress** on a contact: nine Arizona requirements, parallel to stage `inquiry`, prompts but never performs "mark licensed".
- **Teammates**: `agency_invite` + `/settings/team` + `/join/[token]`; sign-in carries `?next=`. Dashboard getting-started checklist ticks itself and disappears.
- **Demo agency**: `demo@porchlight.demo` / `PorchlightDemo!2026` — 269 contacts, 11 sources, 23 licensed homes over 18 months, plus 3 counties, a goal, a pending invite and 3 families mid-onboarding (7/9, 4/9, 2/9). Rebuildable identically in one click. The ledger tells its own story (ambassadors ≈1 staff-hour per home, paid social $9,400/home, radio 0 homes).
- **Add a contact from anywhere** (`/contacts/new`), with a required source picker and inline source creation. Attribution stays mandatory; there is deliberately no catch-all "direct" bucket.
- **Delete a source** on its event page, refused by the FK the moment anyone was captured there, with the refusal explained rather than the button just failing.
- **Usable on a phone.** Hamburger nav below `md`, the board's five lanes swipe with scroll-snap instead of stacking, contact and ledger tables become cards, and the ledger keeps its table for print.
- **Suites green**: smoke **62/62**, anon-audit **39 safe / 0 exposed**, cron 10/10, demo-test 5/5, plus `purge-test-agencies` and `ledger-parity`.

### Known Issues
- No Resend key, so nurture emails are skipped by design — no real send has ever been verified end to end. Note this cannot be demonstrated on the demo agency either: `send.ts` refuses it and fails closed (ADR-010).
- Two things on production remain unproven because they need a human: actual email **delivery**, and a phone scanning a printed QR over mobile data. Everything else about the deploy is verified — see `docs/deploy-setup.md`.
- Playwright e2e and the throttled-3G capture-page check still unwritten; suites aren't in CI (needs a separate test project).
- **No rate limit on `/c/[slug]`** — the only public write path, with ~20 bits of slug entropy. Junk capture would pollute the ledger's denominators (audit F-006).
- **The inbound webhook matches contacts across every tenant** by `ilike` on the from-address, with no `agency_id` filter, on the service-role client. One person in two agencies' lists means a reply can land in the wrong one (audit F-007).
- **Nothing notices if the cron stops.** No error reporting, no heartbeat; a dead tick looks exactly like a quiet week (audit F-011).
- `.env.example` exists on disk but `.gitignore`'s `.env*` excludes it, so a fresh clone can't follow README step 2 (audit F-009).
- **Browser-pane quirk, not a bug:** the preview pane runs with `visibilityState: "hidden"`, so `requestAnimationFrame` never fires and React's Suspense reveal never completes — pages look stuck on "Loading…" and screenshots time out. Flush manually with `window.$RV(window.$RB)` in the console. Real browsers are unaffected.
- JSX in this setup strips the space after an expression at a line break (`{n} people` → "5people"). Bitten twice; use an explicit `{" "}`.

### In Progress
- Audit Horizon 1 is closed and there are no open Critical or High findings.
  Next: a throwaway Supabase project (it unblocks CI *and* stops every
  verification writing to the database production uses), then CI, then a Resend
  account so a nurture email has actually been sent once.

## Implementation History

### 2026-07-26 - Engineering audit, and its Horizon 1

**What was built:** an audit in `docs/audit/` (7 documents, 21 findings across 7
dimensions), then the fixes for everything it rated Critical or High. Plus three
gaps Perry found by using the product, which no static review had surfaced.

**The three usability gaps** (`456d391`, tag `v0.6.0`): there was no way to add a
contact except from inside an event; sources could never be deleted, so every
test event was permanent; and the app was unusable on a phone. The add-contact
form asks for a source rather than inventing a default, because `source_id` is
`NOT NULL` and immutable and the ledger is the reason. Source deletion leans on
the existing FK rather than a new check — Postgres already refuses it once
anyone has been captured.

**Horizon 1** (`074a033`, `90fc1bd`, `b14ee5b`):
- **F-005** Both system endpoints compared against `` `Bearer ${process.env.X}` ``.
  Unset, that renders `"Bearer undefined"`, and anyone sending exactly that got
  in. Fail-open in precisely the case it most needed to fail closed. Now
  `verifySystemSecret()` with `timingSafeEqual`.
- **F-003 / F-012 / F-004** (migration 0011, ADR-013). `app_user`'s UPDATE policy
  had no `with check`, so `role` was self-editable; unsubscribe held a
  service-role client on a public route; and `/u/[id]` opted people out on GET,
  where mail scanners would have done it for them, irreversibly.
- **F-002** (migration 0012). Nine unbounded reads relied on getting everything
  back from a PostgREST that caps at 1000 rows and says nothing. The ledger's
  arithmetic moved into Postgres, which retired the cap and the
  O(sources × contacts) scan together; the cron pages through `fetchAll()`.

**Why:** the audit was to find out what an inherited-code reviewer would say
before an agency's data is in the product. The answer was: the invariants are
unusually good, and the gaps are all in the layer between a working application
and an operated one.

**Two findings were wrong and were corrected in place**, both after running
something instead of reading it. F-001 claimed nine Next.js CVEs including a
middleware bypass, taken from a summary rather than `npm audit` itself — none
existed, all 12 highs are transitive and unreachable, and the recommended bump
cleared none of them. F-003 rated a tenant hop High; testing it showed the hop
is refused with `42501` and only self-promotion works. Both corrections are
visible in the documents rather than silently edited, because the wrong version
was already pushed.

**Files affected:** `docs/audit/**` (new), `supabase/migrations/0011-0012`,
`src/lib/{system-auth,fetch-all}.ts`, `src/components/{MobileNav,AddContactForm,DeleteSource}.tsx`,
`src/app/(app)/contacts/new/`, `src/app/api/unsubscribe/[id]/`, `src/app/u/[id]/page.tsx`,
`scripts/ledger-parity.mjs`, and a responsive pass across 18 pages.
`src/components/AppNav.tsx` deleted (dead since the AppShell rewrite).

### 2026-07-26 - Production on porchlightfostercare.org
**What was built:** no application code — the deployment that makes it real.
Domain bought on Namecheap, DNS pointed at Vercel, Supabase env wired into
Production, auth redirect allow-list updated, fresh `CRON_SECRET` and
`INBOUND_WEBHOOK_SECRET` replacing the dev placeholders.

**Verified live, not assumed:** TLS valid and Namecheap parking records gone;
`NEXT_PUBLIC_APP_URL` compiled into the build (zero `localhost:3000` in served
HTML); `/u/[id]` returning different pages for a real vs bogus contact id, which
is what proves the deployed server reaches Supabase; `/arizona` redirecting to
`/login?next=%2Farizona`; `/api/cron/tick` returning 401 both unauthenticated
**and** with the old dev secret, which is how we know the secret was rotated.

**Two things learned by probing it:**
- Vercel initially had `www` as primary, so the apex 308'd to it — and the apex
  is what `NEXT_PUBLIC_APP_URL` bakes into every QR code. That redirect cost
  0.56s against 0.29s on the one page with a sub-second budget. Swapped so the
  apex serves Production. Whichever domain Vercel serves must be the one in
  `NEXT_PUBLIC_APP_URL`.
- `/c/[slug]` is useless as a connectivity check: it does no DB read on load
  (the slug is validated inside `public_capture()` on submit), so a nonsense
  slug returns 200 exactly like a real one.

**Why:** the demo could not be shown to an agency from a `vercel.app` URL, and
every QR code generated before this pointed at `localhost:3000`.
**Files affected:** `docs/deploy-setup.md` (new runbook), `.env.vercel.local`
(gitignored). No `src/` changes.

### 2026-07-26 - Milestone 5 slices E–H (Arizona, onboarding, team)
**What was built:**
- **E — Arizona dashboard** (0007). Inventorying the two DCS workbooks *before*
  writing the parser corrected two things the plan was built on: A.R.S. item 18
  is licensed homes receiving *visitation* (statewide), not "minimum homes
  required by region" — no region grain exists in any published Arizona data;
  and the group-home series 1,995/1,732/1,457 reconciles with neither workbook,
  so it was dropped for INDICATOR 8 (share of care days: 15.2% → 15.8% → 17.2%,
  rising against DCS's own goal of a two-point cut). The workbooks also
  independently confirm the headline — 4,875 licensed homes in SFY17 against
  1,859 in SFY25 is −61.9%, i.e. the Governor's "62%".
- **F — Onboarding progress** (0008). Parallel `journey` record, no new stage.
- **G — Teammates** (0009). `create_agency()`/`accept_invite()` RPCs;
  `SUPABASE_SERVICE_ROLE_KEY` gone from `src/app` entirely.
- **H — Suites + docs** (0010). anon-audit extended to every new table and RPC,
  and it immediately found a real hole (see Lessons). smoke-test +27 assertions.

**Why:** M5's goal was a platform an Arizona recruitment director sees as a
product. The Arizona page is the one screen that argues before any of the
agency's own data exists.
**Files affected:** `supabase/migrations/0007-0010`, `src/app/(app)/arizona/**`,
`src/app/(app)/settings/team/**`, `src/app/join/**`, `src/components/{JourneyPanel,GettingStarted,InviteLink}.tsx`,
`src/lib/arizona.ts`, `src/lib/demo/seed.ts`, `scripts/az-stats-import.mjs`,
`docs/az-data-sources.md`.

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

Next.js 16.2 App Router monolith on Vercel; Supabase (Postgres + RLS + Auth) as the only backend; Resend for email; daily Vercel cron drives all automation. See architecture.md.

The direction of travel since M5 is **arithmetic and authorization moving down into Postgres**. The ledger now aggregates in SQL (0012), tenancy is pinned by trigger rather than by an accident of an unrelated policy (0011), and anonymous writes go through two named security-definer doors (`public_capture`, `public_unsubscribe`) instead of a service-role client. The app is steadily becoming a renderer over a database that enforces its own rules, which is ADR-002 taken further than it was originally written.

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
- **"Follow the same pattern as X" is only safe if X is currently correct.** Slice F copied `nurture_template`'s RLS policy from 0002 — the version *before* 0004 fixed it — and so reintroduced the exact anon-read hole 0004 had closed. When copying a pattern, copy it from the latest migration that touches it, not the one that created it.
- A Postgres policy with no `to` clause applies to **every** role including `anon`. The dangerous shape is a global-default row: `using (agency_id is null or agency_id = current_agency_id())` is true for a caller with no agency. Plain `agency_id = current_agency_id()` is safe, because NULL is not TRUE.
- Verifying a cleanup by logging "done" instead of checking `error` hides failures. An `app_user` delete silently failed on an FK from `agency_invite.invited_by_user_id`, and the log said it had worked.
- The JSX space-stripping trap (`{expr}` then a line break) has now bitten three times. Always `{" "}`.
- `NEXT_PUBLIC_*` is inlined at **build** time. Setting it in the Vercel dashboard changes nothing until a rebuild with the cache off — the old value stays compiled into the bundle, so QR codes keep pointing wherever they used to.
- Supabase rejects a non-allowlisted auth redirect **silently**, substituting the Site URL rather than erroring, so a broken config looks identical to a working one. `admin.generateLink()` returns the link without mailing it, which makes the allow-list checkable without an inbox.
- A page returning 200 does not mean it reached the database. Pick a probe that actually reads (`/u/[id]`), and prove it by comparing a real id against a bogus one.
- `supabase-js` `.select("*", { head: true })` returns 204 with no error for a table that does not exist — useless as an existence check. Use `.select("*").limit(1)` and read `error`.
- SheetJS's ESM build has no `fs` bound: `XLSX.readFile()` throws "Cannot access file". Read the bytes and use `XLSX.read(buffer)`.
- **A silent cap is worse than a small one.** PostgREST returns the first 1000 rows with HTTP 200 and no truncation flag, so nine reads were quietly wrong and the ledger would have under-reported in front of a funder. Where a cap is genuinely wanted (the board renders a node per contact), state it on the page. A visible cap is a decision; an invisible one is a bug.
- **Never publish an advisory count or CVE title you did not copy from the tool.** F-001 was the audit's headline finding, described nine Next.js vulnerabilities that do not exist, and was built from a paraphrase of `npm audit`. The bump it recommended cleared nothing.
- **"Can B read A's rows" is the easy half of a tenancy test. Ask whether B can stop being B.** Every isolation assertion passed while `role` was self-editable, because nothing tried to change the row that decides who you are.
- **A lock can be installed by accident.** The tenant hop turned out to be blocked, but only because an unrelated SELECT policy is evaluated against the post-update row. Nothing declared `agency_id` immutable, so widening that policy later would have silently unlocked it. Emergent protection is not protection.
- **Don't push code that depends on an unapplied migration.** `/ledger` was broken on `main` for a stretch because the page called RPCs that did not exist yet. Either ship the code after the migration lands, or keep the old path until it does.
- **Read `memory.md` before debugging the environment.** The browser-pane Suspense quirk below was already written down here, and rediscovering it from scratch cost most of an afternoon.
