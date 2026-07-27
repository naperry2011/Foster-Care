# Porchlight: Codebase Audit Report

**Prepared for:** Nicholas Perry, owner and sole contributor
**Prepared by:** codebase-audit, functional-CTO review
**Date:** 2026-07-26
**Repo:** `C:\Users\Perry\Dropbox\PC\Documents\GitHub\Foster-Care` at HEAD `980985b` on `main`, working tree clean.
**Scope:** internal codebase. No external vendor or contractor relationship is in play, so section 4 is a forward look rather than a vendor recommendation.

---

## 1. Executive Summary

Porchlight is a well-engineered product with an unusual profile: the parts most
codebases get wrong are right here, and the gaps are almost entirely in the layer
between a working application and an operated one. Strict TypeScript passes clean,
the build is green, `src/` has zero debug logging and zero debt markers, git history
holds no secrets across all 34 commits, and the security-critical invariants live in
Postgres rather than in application code, which means they survive future bugs. The
verification suites are genuinely good and have caught two real security holes that
nothing else would have. There are **no Critical findings**. There are four High
findings, and each is a small, contained fix.

> **Correction, 2026-07-26.** The first issue of this report led with F-001,
> describing nine Next.js advisories including an App Router middleware bypass, and
> made it the top Horizon 1 item. That was wrong: `npm audit` contains no direct
> Next.js advisory. All 12 highs are transitive, and the bump to `16.2.12` was
> applied without changing the count. F-001 is now Low, the High count drops from
> four to three, and the summary and roadmap below are re-sequenced accordingly.
> Details and cause are in the F-001 entry of `findings.md`.

Three things matter most this week.

**First, three silent-failure paths sit on the demo narrative.** Nine unbounded
PostgREST reads in the cron and the ledger will stop at Supabase's default 1,000-row
cap, returning HTTP 200 with no truncation signal, which turns the ledger's numbers
quietly wrong and stops the cron processing contacts past the cap (F-002). The
one-click unsubscribe link performs an irreversible opt-out on GET, so corporate
mail scanners will silently and permanently remove recipients before a human reads
the message (F-004). And a wake-up is marked fired even when its task insert failed,
consuming the one moment the waiting room delivers value (BUG-004). None has fired
yet, because no email has been sent and no tenant has 1,000 contacts. All three will
fire during the first design partner's first month.

**Second, a member can promote themselves to any role.** *(Revised: originally
stated as a tenant hop. Live testing showed the hop is refused with `42501` and
only the role change succeeds. Severity High to Medium; see the F-003
correction.)* `app_user_self_update` has no `WITH CHECK` clause and no column restriction,
so an authenticated member can rewrite their own `agency_id` and `role`. Every RLS
policy in the schema resolves through that column via `current_agency_id()`. This is
not exploitable by a stranger today, because nothing discloses another agency's UUID
and there is currently one real tenant, but it is one leaked identifier away, and it
is exactly the class of defect the anon audit was built to catch and does not
currently cover (F-003).

**Third, nothing verifies any of this automatically.** There is no CI, no branch
protection, and the five verification suites cannot run without live service-role
credentials, so they execute only when someone remembers. `anon-audit.mjs` has
caught two real security holes by the owner's own record, and F-003 is precisely
the kind of defect it would catch if its coverage were extended and it ran on every
change. The blocker is correctly identified in `docs/ai/tasks.md` as a throwaway
Supabase project, but four of the five gates (typecheck, lint, build, audit) need no
database and can land today (F-008).

**The recommended path is a focused week of fixes (all three High findings are small
and independent), then CI before the first design partner, then the pilot.** Nothing
here calls for rework or redesign.

The findings register lists **21 items across seven dimensions, with 0 Critical and
2 High** after two corrections made by checking claims against the tools rather
than the code (F-001 High to Low, F-003 High to Medium). Of those two Highs, F-004
is fixed and merged, leaving **F-002, the 1,000-row cap, as the only open High**.
On the positive side: the secret scan
is clean across the entire history, the open-redirect surface on the sign-in path is
correctly closed in both places it appears, the send layer's consent and idempotency
gates are structurally sound, and erasure is implemented and tested, which is a
materially better privacy position than most products at this stage.

The three-horizon roadmap below sequences the work: stop the bleeding this week,
stabilize before the pilot, and build the operational base this quarter.

---

## 2. Findings by Dimension

Full evidence and recommendations are in [`findings.md`](findings.md). Reproducible
defects are in [`bugs.md`](bugs.md).

### 2.1 Contributor Assessment

- Single author, single identity, 34 commits across two working days (2026-07-12 and
  2026-07-26), with a two-week gap between them.
- 33 of 34 commits carry a `Co-Authored-By: Claude Opus 5` trailer. The history is
  transparently AI-paired rather than quietly so.
- Commit message quality is 25 good, 9 adequate, 0 poor. Thirty of thirty-four carry
  substantial explanatory bodies, several over 150 words documenting root cause,
  trade-offs and deliberate omissions.
- Recurring "Verify X against live DB" commits create an auditable evidence trail.
  `c9b2a69` names a security hole, the migration that introduced it, and the
  mitigation, in its subject line.
- The committer address (`perry.ai2011@gmail.com`) differs from the account address
  on file. Worth linking both on GitHub or the contributions will not attribute.

**Assessment.** This is a disciplined one-person repository, and the discipline is
visible in places that are hard to fake: security fixes are named rather than
buried, partial state is flagged with `(migration NNNN pending)` rather than hidden,
and defects found by driving the real product are recorded as such. The single
structural weakness is the one that cannot be fixed by discipline. There is no
second reviewer, no CI, and no branch protection, so every control in this project
depends on one person remembering to run it. The audit's Horizon 2 is aimed
squarely at converting that discipline into mechanism.

### 2.2 Git Hygiene and Workflow (Hygiene scorecard: 16 / 30)

| Dimension | Score | Note |
|---|---:|---|
| Bus factor | 0 / 3 | Single author, single machine |
| Commit messages | 3 / 3 | 25 good, 0 poor |
| Commit atomicity | 1 / 3 | Four bootstrap commits of 1,000 to 7,778 lines (F-017) |
| Branching model | 1 / 3 | 33 commits direct to `main`, one short-lived feature branch |
| Release tagging | 0 / 3 | No tags; nothing marks what is in production (F-016) |
| Secrets in history | 3 / 3 | Clean across all commits and all refs |
| `.gitignore` quality | 2 / 3 | Correct coverage, but blocks `.env.example` (F-009) |
| Repo size and binaries | 3 / 3 | 688 KiB, no binaries, no datasets |
| History integrity | 3 / 3 | No force-push, rebase or reset in any reflog entry |
| CI and branch protection | 0 / 3 | None (F-008) |

The shape of that score is more informative than the number. Everything in the
author's direct control scores at or near full marks. Everything requiring a second
person or a machine scores zero.

### 2.3 Code Quality and Architecture (0 High, 3 Medium, 2 Low)

**Strengths:**

- Product invariants live in Postgres, not application code: `source_id` immutable by
  trigger, `stage_change` and `touch` append-only, stages movable only through
  `set_contact_stage()`, opt-out irreversible. These survive future bugs, which is
  the point (ADR-002).
- One audited exception to append-only, via a transaction-local GUC settable only
  inside `delete_contact()`, so "please delete my information" is answerable without
  opening a path to selective history rewriting (ADR-007).
- `strict: true` with no strict-family flag disabled. `npx tsc --noEmit` clean.
- Zero `console.log`, zero `TODO`/`FIXME`/`HACK`, zero `@ts-ignore` in `src/`. One
  `as any` in the whole codebase.
- Eleven ADRs that record rejected alternatives and negative consequences, not just
  decisions. This is the single biggest factor in how quickly this audit could reach
  substantive findings.

**Weaknesses:**

- The send layer is documented as channel-agnostic and is email-specific at every
  seam: its name, its consent check, its provider construction, two hardcoded
  `channel` literals, its transport headers and its `Template` type (F-014). SMS is
  on the roadmap and will meet this first.
- Service-role capability is reachable from a public unauthenticated route, and the
  ADR that was supposed to prevent it states its guarantee as a string check that is
  still literally true (F-012).
- Tenant scoping has exactly one enforcement layer with no application-side backstop
  (F-013). This is a defensible deliberate trade-off, but it makes the untested
  suites (F-008) load-bearing.
- Lint reports 86 warnings to 0 errors, all from the verification harness, which
  trains the reader to skim (F-018).
- The proxy's env-missing branch does not do what its comment says (F-019).

### 2.4 Bugs and Stability (2 P1, 3 P2, 1 P3)

**Verification commands run:** `npx tsc --noEmit` (exit 0, clean), `npm run lint`
(exit 0, 86 warnings), `npm run build` (exit 0, 24 routes, roughly 25 seconds),
`npm audit`, `npm outdated`, full git history analysis across all refs. The five
`scripts/*.mjs` suites were **not run**: they require live service-role credentials
and create and destroy real database records.

**Headline bugs:**

- **BUG-001 / F-002 (P1)** Nine unbounded reads across `ledger/page.tsx` and
  `api/cron/tick/route.ts` hit PostgREST's 1,000-row default cap silently. The ledger
  reports wrong numbers with a 200 response; the cron stops processing contacts past
  the cap. Already logged as tech debt, but as a performance item rather than a
  correctness one.
- **BUG-002 / F-004 (P1)** `/u/[id]` performs an irreversible opt-out on GET, with no
  RFC 8058 POST path. Mail scanners will trigger it before a human reads the message,
  and a database trigger makes it unrecoverable.
- **BUG-003 / F-007 (P2)** The inbound webhook resolves contacts with `ilike` across
  every tenant on the service-role client, with no `agency_id` filter. One person in
  two agencies' lists means a reply lands in the wrong tenant, into an append-only
  table.
- **BUG-004 (P2)** `wake_up_fired_at` is set even when the task insert failed,
  permanently consuming a wake-up.
- **BUG-005 (P3)** Cold-flag tasks are the one task kind with no `dedupe_key`, so
  overlapping ticks duplicate them.
- **BUG-006 / F-019 (P3)** With Supabase env absent, authed routes reach the error
  boundary instead of redirecting to `/login`.

Nine specific defect classes were checked and found absent, including debug logging,
open redirect on the sign-in path, double-send on a re-fired cron, and demo-tenant
email leakage. Details in [`bugs.md`](bugs.md).

### 2.5 Security and Compliance (0 Critical, 1 High, 4 Medium, 1 Low)

- **F-001 (Low, corrected, moved to Operational Readiness)** 12 high advisories, all
  transitive and none reachable from a request: `postcss` and `sharp` bundled inside
  `next`, plus a dev-only eslint chain. The bump to 16.2.12 was applied and changed
  nothing. See the correction in `findings.md`.
- **F-003 (Medium, corrected)** A member can set their own `role` to anything;
  verified live. The tenant hop originally claimed here is refused by RLS with
  `42501` and does not occur. Fixed in migration 0011, not yet applied.
- **F-003, original wording (superseded)** `app_user_self_update` has no `WITH CHECK` and no column
  restriction, so a member can rewrite their own `agency_id` and `role`, which is the
  column every RLS policy resolves through.
- **F-005 (Medium)** Cron and webhook auth compare against the literal string
  `"Bearer undefined"` when the secret is unset, turning a fail-closed check into a
  fail-open one in any environment missing the variable, such as a preview deploy.
- **F-006 (Medium)** The only public write path has no rate limit, no honeypot and no
  format validation. Junk capture poisons the ledger, which is the product's
  headline artifact, and feeds addresses to the nurture cron.
- **F-007 (Medium)** Inbound webhook resolves contacts across tenants by pattern
  match. The only query in the codebase that leaves the RLS boundary without
  re-imposing a tenant filter in code.
- **F-010 (Medium)** The production service-role key and both system secrets sit at
  rest in a Dropbox-synced folder. Correctly gitignored, which does nothing about the
  sync client.
- **F-020 (Low)** Capture slugs carry roughly 20 bits of entropy with modulo bias,
  which is what makes F-006 practical rather than theoretical.

**Compliance posture.** Better than typical for this stage. No child data anywhere,
by design and with the fence restated in the ADRs. Erasure is implemented, audited
and smoke-tested, including for contacts mid-checklist. Consent is checked at the
single send layer rather than by policy. The gaps are procedural: no privacy policy
in the repository, no data-processing agreement with Resend (which will process PII
about identifiable adults), no documented retention period, and no subject-access
export path.

### 2.6 Operational Readiness (0 Critical, 0 High, 3 Medium, 2 Low)

- **F-008 (Medium)** No CI, no branch protection, no `test` script. The five suites
  are the strongest control in the product and run only when someone remembers.
  Blocked on a throwaway Supabase project, correctly identified in `tasks.md`, but
  four of the five gates need no database and can land today.
- **F-011 (Medium)** No error reporting, and nothing notices when the daily cron does
  not run. For a product whose entire automation is one HTTP request per day, a
  silently dead cron is the worst available failure and is currently undetectable.
- **F-009 (Medium)** `.gitignore` excludes `.env.example`, which the README's setup
  step 2 instructs the reader to copy. A fresh clone cannot follow the documented
  setup. One-line fix, and the clearest bus-factor item in the repository.
- **F-015 (Low)** `xlsx` is pinned to a vendor CDN tarball outside the registry.
  Integrity-hashed, so tamper-resistant, but invisible to `npm audit` and to
  Dependabot, and a single point of failure for clean installs.
- **F-016 (Low)** No release tags across five milestones and a live production
  deploy. A rollback has no target.

### 2.7 Design and Abstraction (0 High, 3 Medium, 0 Low)

- **F-012 (Medium)** `createAdminClient()` is a bare factory with no policy about who
  may call it, and it has already reached an unauthenticated public route. ADR-012's
  guarantee is worded as a string check that remains literally true while the
  property it stood for has eroded. Four call sites today, so narrowing it is cheap.
- **F-013 (Medium)** One enforcement layer for tenancy, resolving through one
  writable column, with no application-side backstop. Deliberate and defensible; the
  right response is to strengthen the test side rather than duplicate checks.
- **F-014 (Medium)** ADR-003 records a channel-agnostic send layer as delivered. The
  code has the shared gates (consent, dedupe, pause, demo block) that ADR-004 needs,
  and none of the channel abstraction ADR-003 claims. Two call sites and one type, so
  the seam is cheap to build now and expensive under an A2P deadline later.

**Plan evaluation.** Four forward items were read as design choices rather than
logged as in-flight. Three are confirmed: the ledger SQL view is the right
destination (though filed under the wrong reason), the CI blocker is correctly
diagnosed, and the Playwright priority is right. One is flagged: ADR-003, as F-014.
The deep redesign of the send seam belongs to a focused session, not to this audit.

---

## 3. Three-Horizon Roadmap

### Horizon 1: Stop the Bleeding (this week)

Roughly one focused day of work. All four are independent.

**All of Horizon 1 is written and merged as of 2026-07-26. One step remains for
anybody: migration 0011 has not been run.**

| # | Item | Finding | Status |
|---|---|---|---|
| H1-1 | **Run migration 0011.** Forward-only, once. Then re-run `smoke-test` and `anon-audit` | F-003, F-004, F-012 | **Outstanding.** Needs a DB credential; the service-role key cannot execute DDL |
| ~~H1-2~~ | Column guard on `app_user`, plus three smoke-test assertions | F-003 | Written, pending 0011. Downgraded to Medium after testing |
| ~~H1-3~~ | Unsubscribe asks on GET, writes on POST; RFC 8058 one-click endpoint | F-004 | Written, pending 0011 |
| ~~H1-4~~ | Fail closed on missing system secrets, `timingSafeEqual` | F-005 | **Done and live** |
| ~~H1-5~~ | `public_unsubscribe()` replaces service-role on a public route | F-012 | Written, pending 0011 |
| ~~H1-6~~ | Bump `next` to `16.2.12` | F-001 | **Done**, and it cleared no advisory |

**With Horizon 1 closed, F-002 (the 1,000-row cap) is the highest-severity open
finding in the register and should be the next thing built.**

### Horizon 2: Stabilize (before the first design partner)

| # | Item | Finding | Severity |
|---|---|---|---|
| H2-1 | Paginate all nine unbounded reads; log a warning when a page returns exactly full | F-002 | High |
| H2-2 | Fix BUG-004 (check the insert error before setting `wake_up_fired_at`) and BUG-005 (add a `cold_flag` dedupe key) | F-002 | High |
| H2-3 | Rate limit, honeypot and format validation on `/c/[slug]`; widen the slug to 8 characters with rejection sampling | F-006, F-020 | Medium |
| H2-4 | GitHub Actions on pull request: `npm ci`, `tsc --noEmit`, `lint`, `build`, `npm audit --audit-level=high`. No database needed | F-008 | Medium |
| H2-5 | Un-ignore `.env.example` and commit it, with a comment per variable | F-009 | Medium |
| H2-6 | Delete `.env.vercel.local`; move the repo out of the Dropbox tree or exclude `.env*` from sync; rotate the service-role key if the exposure window is judged material | F-010 | Medium |
| H2-7 | Fix the inbound webhook: exact match on a normalized column, tenant resolved from the address rather than the sender | F-007 | Medium |
| H2-8 | `cron_run` table plus a visible last-successful-run indicator; make the tick return non-200 on failure | F-011 | Medium |
| H2-9 | Tag `v0.5.0` at the current production commit and tag every deploy thereafter | F-016 | Low |

### Horizon 3: Build Forward (this quarter)

| # | Item | Finding |
|---|---|---|
| H3-1 | Throwaway Supabase project, then the five suites in CI, then branch protection on `main` | F-008 |
| H3-2 | Ledger aggregation into a SQL view or RPC, retiring both the row cap and the in-memory scan | F-002 |
| H3-3 | Narrow `createAdminClient` to the two system endpoints, enforced by `no-restricted-imports`; give unsubscribe its own `public_unsubscribe()` RPC | F-012 |
| H3-4 | Build the channel seam in `send.ts` before the Twilio A2P registration clears, and amend ADR-003 to match reality | F-014 |
| H3-5 | Add error reporting (Sentry or equivalent) on both server and client | F-011 |
| H3-6 | Extend `smoke-test.mjs` from "can A read B" to "can A become B"; add a cross-tenant inbound-webhook assertion | F-013, F-007 |
| H3-7 | Privacy policy, Resend data-processing agreement, documented retention period, subject-access export | section 2.5 |
| H3-8 | Playwright e2e on the capture path, plus the throttled-3G check | already planned |

---

## 4. Forward Look

This audit covers the engineering foundation. For a read of what Porchlight is
trying to be, where it stands against that, and what to build next, see
[`product_strategy.md`](product_strategy.md).

The condensed answer to "what comes after the audit fixes":

1. **One design partner, one event, end to end.** Five separate paths in this product
   are built and never exercised: QR capture from a real phone, a delivered nurture
   email, an inbound reply, a fired wake-up, and a populated ledger. Every one has an
   audit finding on it, and one Saturday converts all five into either confidence or
   a short defect list. That is worth more than any feature.
2. **The weekly habit, then Spanish.** The cron already computes everything a Monday
   digest would contain and nothing pushes it; that is the cheapest retention
   mechanism available. Spanish on the capture page and the first nurture sequence
   should land before scale rather than after, because the schema is easiest to
   change now and because Arizona's recruitment problem is substantially a
   Spanish-speaking-household problem.
3. **Protect the refusals.** The "deliberately not built" list, the refusal of CSV
   contact import, and the fence around child data are what make this product
   legible in a market whose gravity pulls toward the application and the case file.
   They read as limitations and function as strategy.

---

## Appendices

- [Findings Register](findings.md) - 21 findings with evidence and recommendations
- [Bug Log](bugs.md) - 6 defects with repro steps, plus 9 classes checked and absent
- [Git Analysis](git_analysis.md) - contributors, cadence, hygiene scorecard
- [Dependency Inventory](dependencies.md) - 442 packages, advisories, notable absences
- [Architecture and Implementation](architecture_and_implementation.md) - diagrams, third-party inventory, feature walkthrough, verification plan
- [Product Strategy](product_strategy.md) - intent, gap, sequence, open questions

Pre-existing context read before searching: `README.md`, `AGENTS.md`, `CLAUDE.md`,
`llms.txt`, `docs/PLAN.md`, `docs/ai/architecture.md`, `docs/ai/decisions.md`,
`docs/ai/roadmap.md`, `docs/ai/tasks.md`, `scripts/README.md`. No `CODE_MAP.md`,
`ENTRY_POINTS.md`, `DATA_FLOW.md` or `FEATURE_BOUNDARIES.md` exist at the repo root;
`docs/ai/architecture.md` serves that role and is accurate.

**Verification gaps** are enumerated in F-021. The most significant: no database was
touched, so every claim about RLS behavior is read from migration SQL rather than
observed, and the five verification suites were not run.

---
generated_by: codebase-audit skill v1.1
generated_on: 2026-07-26
project: C:\Users\Perry\Dropbox\PC\Documents\GitHub\Foster-Care
project_type: node
verification: full
---
