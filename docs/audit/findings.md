# Findings Register

Severity: **C**ritical / **H**igh / **M**edium / **L**ow.
Verification labels: **VERIFIED** (reproduced or directly observed), **STATIC-ONLY**
(read in code, not reproduced), **HYPOTHESIS** (needs follow-up to confirm).

Dimensions: Contributor · Git Hygiene · Code Quality · Bugs & Stability ·
Security & Compliance · Operational Readiness · Design & Abstraction.

---

## F-001: Twelve high advisories, all transitive, none in Next.js itself (Low / Operational Readiness)

**Verification:** VERIFIED. **Corrected 2026-07-26 after applying the bump.**

> **Correction.** The first issue of this register rated this finding High and
> described nine Next.js advisories including an App Router middleware bypass and
> unauthenticated server-function endpoint disclosure. That was wrong. No such
> advisories appear in `npm audit` output. The bump to `16.2.12` was applied and
> the count did not move, because `next` is flagged only as a carrier for its
> bundled `postcss` and `sharp`. The finding is restated below from the actual
> output, and the severity drops from High to Low. Nothing in the register
> depended on the incorrect version except the Horizon 1 ordering in `report.md`,
> which has been re-sequenced.

**Evidence:**
- `npm audit --json` at `next@16.2.12` reports **12 high, 0 critical, 0 moderate,
  0 low**. Every one is transitive; none is a vulnerability in Next.js code.
- **Three are build-toolchain, carried by `next`:** `postcss` (`<=8.5.17`, XSS via
  unescaped `</style>` in stringify output, plus two `sourceMappingURL`
  path-traversal and arbitrary-file-read issues) and `sharp` (`<0.35.0`, four
  inherited libvips CVEs). `next` itself appears only with
  `via: [postcss, sharp]`.
- **Nine are the dev-only eslint chain:** `eslint`, `@eslint/config-array`,
  `@eslint/eslintrc`, `eslint-plugin-import`, `eslint-plugin-jsx-a11y`,
  `eslint-plugin-react`, `eslint-config-next`, `minimatch`, `brace-expansion`.
  All trace to one root cause, a `brace-expansion` denial of service via unbounded
  expansion length.
- npm's suggested remediations are both nonsense: `next@9.3.3` and
  `eslint-config-next@0.2.4`. Neither is a fix; both are catastrophic downgrades
  that npm proposes because they predate the vulnerable ranges.

**Impact:** Materially lower than first stated. `postcss` processes the project's
own Tailwind CSS at build time and never sees user input. `sharp` backs
`next/image` optimization, and Porchlight optimizes no user-supplied images (the
one raw `<img>` at `events/[id]/page.tsx` is a locally generated QR data URL, and
`opengraph-image` is static). The eslint chain never ships and runs only when a
developer invokes it. There is no path here from an anonymous request to any of
these, which is the opposite of what the previous wording implied.

**Recommendation:**
1. **Done:** `next` and `eslint-config-next` moved from `16.2.10` to `16.2.12`.
   Typecheck, lint and build all stayed green. Keep it: two patch releases of
   upstream fixes for no cost, even though it cleared no advisory.
2. For `postcss` and `sharp`, wait. They resolve when Next ships a release
   bundling patched versions. Do not attempt an override; a forced `sharp` bump
   under `next/image` is a good way to break image optimization for no real gain.
3. For the eslint chain, schedule the eslint 9 to 10 migration as ordinary
   maintenance, not as a security task.
4. Re-run `npm audit` before each deploy until CI does it (F-008), and read the
   `via` chain rather than the headline count. A total of "12 high" on this
   project has so far meant zero reachable vulnerabilities.

**Process note.** This finding was originally written from a summary that was not
checked against raw `npm audit` output. Advisory counts and titles belong in an
audit only when copied from the tool, not paraphrased.

---

## F-002: Every unbounded read in the cron and the ledger stops at 1,000 rows (High / Bugs & Stability)

**Verification:** STATIC-ONLY. Cross-references BUG-001, BUG-004, BUG-005.

**Evidence:**
- `src/app/(app)/ledger/page.tsx:20-28`. Four `select()` calls with no `.range()`,
  no `.limit()` and no pagination, feeding TypeScript aggregation for every figure
  on the page.
- `src/app/api/cron/tick/route.ts:32-38`, `:73-82`, `:116-125`, `:146-150`,
  `:190-195`. Five more, each driving a loop that sends email or creates tasks.
- Supabase's hosted PostgREST defaults `max-rows` to 1,000. Exceeding it returns
  HTTP 200 with the first 1,000 rows and no truncation signal.
- `docs/ai/tasks.md:64` records the ledger case as tech debt, framed as performance.

**Impact:** Two of the product's three core promises degrade silently past a
threshold a successful pilot will cross. The ledger, described in the README as the
screen that closes the sale, would under-report captures and licensed homes in
front of a funder with no error to notice. The cron would stop processing wake-ups
and nurture for contacts beyond the cap, which breaks the waiting-room promise
without breaking anything visible. Silence is the problem: nothing fails, nothing
logs, the tick returns `{"ok": true}`.

**Recommendation:**
1. Add explicit pagination to all nine reads, and log a warning whenever a page
   comes back exactly full. Do this first; it is a small change and it converts a
   silent failure into a loud one.
2. Move the ledger to a Postgres view or aggregating RPC. That removes the cap and
   the O(sources x contacts) in-memory scan at `ledger/page.tsx:36` together.
3. Use keyset pagination in the cron so a long tick stays correct as rows change.
4. Reword the tech-debt note in `docs/ai/tasks.md` from a performance item to a
   correctness one, so the next reader does not defer it for the wrong reason.

---

## F-003: A member can promote themselves, but cannot change tenant (Medium / Security & Compliance)

**Verification:** VERIFIED against the live database, 2026-07-26.

> **Correction.** This was rated High on the strength of a cross-tenant read, and
> that half is wrong. Executed as a signed-in member of agency B:
>
> | Attempt | Result |
> |---|---|
> | `update app_user set agency_id = <agency A>` | **Refused.** `42501 new row violates row-level security policy for table "app_user"`. Row unchanged. |
> | `update app_user set role = 'owner'` | **Succeeded.** No error; the row now reads `role: "owner"`. |
> | `update app_user set full_name = ...` | Succeeded, as it must, or `/settings` breaks. |
>
> The tenant hop does not happen. `app_user_same_agency` is a SELECT policy of
> `agency_id = current_agency_id()`, and the new row fails it, so the write is
> rejected. The severity drops from High to Medium: what remains is real but
> currently inert, not a path to another agency's data.
>
> Note **why** the hop is blocked, because it matters. Nothing says `agency_id`
> is immutable. It is refused as a side effect of an unrelated SELECT policy
> being evaluated against the post-update row. That is a working lock installed
> by accident, and it would quietly disappear if the SELECT policy were ever
> widened. Migration 0011 is still worth applying: it converts an emergent block
> into a stated rule, and it closes the role hole, which is genuinely open.

**Original assessment (retained for the reasoning, severity superseded above):**

**Evidence:**
- `supabase/migrations/0001_schema.sql:204-205`:
  `create policy app_user_self_update on app_user for update using (id = auth.uid());`
  There is no `with check` clause and no column restriction. Postgres reuses the
  `USING` expression as the check, so the only constraint on the new row is that it
  is still the caller's own row.
- `supabase/migrations/0001_schema.sql:194-197`. `current_agency_id()` reads
  `agency_id` from that same row, and every RLS policy in the schema is written as
  `agency_id = current_agency_id()`.
- No trigger protects `app_user.agency_id` or `app_user.role`. Confirmed by grep
  across all ten migrations.
- `scripts/smoke-test.mjs` tests cross-tenant isolation by reading as the wrong
  user; it does not attempt to change `app_user.agency_id`, so this path is
  untested.
- `role` is currently display-only (`src/app/(app)/settings/page.tsx:42` and
  `settings/team/page.tsx:64`); nothing in code or RLS gates on it.

**Impact (revised against the test results):** Self-promotion is real and
demonstrated. It is inert today only because `role` gates nothing: grep confirms
it is read in two places, both of which render it as a label. The moment any
feature branches on `role` (an admin-only settings page, a "who can invite"
rule, a delete permission), every member silently already has whatever the top
role is. That is the trap, and it is cheap to close now and expensive to notice
later.

The tenant hop, which is what justified the original High rating, does not occur.
The data-exposure scenario described in the first issue of this register was
wrong, and no cross-tenant read is reachable through this path.

**Recommendation:**
1. Replace the policy with one that pins the mutable surface:
   `using (id = auth.uid()) with check (id = auth.uid() and agency_id = current_agency_id() and role = (select role from app_user where id = auth.uid()))`,
   or more simply add a `before update` trigger on `app_user` that raises if
   `agency_id` or `role` changed and the caller is not `service_role`.
2. Consider narrowing the grant instead: revoke `UPDATE` on `app_user` from
   `authenticated` and route the one legitimate edit (`full_name`, at
   `src/app/(app)/settings/actions.ts:22`) through a security-definer RPC, matching
   the pattern ADR-012 established for `create_agency` and `accept_invite`.
3. Add an assertion to `scripts/smoke-test.mjs`: signed in as agency A, attempt to
   set `agency_id` to agency B and to set `role` to `director`. Both must fail.
   This is the check that would have caught it.

---

## F-004: One-click unsubscribe writes an irreversible opt-out on GET (High / Bugs & Stability)

**Verification:** STATIC-ONLY. Cross-references BUG-002.

**Evidence:**
- `src/app/u/[id]/page.tsx:24-32`. A server component rendered on GET sets
  `opted_out_at`, `consent_email = false` and `consent_sms = false`.
- `supabase/migrations/0001_schema.sql:115-117`. A trigger makes `opted_out_at`
  irreversible once set.
- `src/lib/send.ts:105`. The URL ships as a bare `List-Unsubscribe` header with no
  `List-Unsubscribe-Post: List-Unsubscribe=One-Click` companion, so RFC 8058's POST
  contract is not in play and only the GET path exists.

**Impact:** Corporate mail scanners (Defender Safe Links, Proofpoint, Mimecast) and
client prefetchers issue GET against every URL in a message before a human reads
it. Each one permanently opts that person out. Porchlight's core claim is holding
"not yet" gently for years; this removes people from the funnel silently and, by
the product's own design, unrecoverably. No nurture email has been sent yet
(`docs/ai/tasks.md:28`), so this has not fired in production, which makes it
cheap to fix now and expensive to discover during the first real campaign.

**Recommendation:**
1. Render a confirmation page on GET and perform the write from a server action on
   POST. This alone closes the scanner path.
2. Add proper RFC 8058 one-click support (`List-Unsubscribe-Post` plus a POST
   route), so Gmail and Outlook keep their native unsubscribe button while scanners,
   which do not POST, cannot trigger it.
3. Consider an `unsubscribe_pending_at` grace column so a mistaken opt-out has a
   documented reversal path without weakening the irreversibility invariant.
4. Do this before the Resend account goes live, which is item 2 on
   `docs/ai/tasks.md`.

---

## F-005: System-endpoint auth compares against the string "Bearer undefined" when the secret is unset (Medium / Security & Compliance)

**Verification:** STATIC-ONLY

**Evidence:**
- `src/app/api/cron/tick/route.ts:14-18`. The check is
  `request.headers.get("authorization") !== \`Bearer ${process.env.CRON_SECRET}\``.
  With `CRON_SECRET` unset, the template renders `"Bearer undefined"`, and a request
  carrying that exact literal header passes.
- `src/app/api/webhooks/inbound/route.ts:8-12`. Same shape, comparing against
  `process.env.INBOUND_WEBHOOK_SECRET`, which is `undefined` when unset.
- `src/proxy.ts:44`. `/api/` is exempt from the proxy on the stated grounds that
  "routes guard themselves with secrets", so this comparison is the entire gate.
- Both comparisons are non-constant-time, a minor secondary issue over HTTP.
- Production has real values (`.env.vercel.local`, generated 2026-07-26), so this
  is not an open door on the live deployment today.

**Impact:** Any environment that omits the variable turns a fail-closed check into a
fail-open one with a publicly guessable credential. Vercel preview deployments do
not inherit Production environment variables unless explicitly scoped to Preview,
and a preview build normally points at the same Supabase project. In that
configuration an unauthenticated caller could drive `/api/cron/tick`, which sends
email and creates tasks across every tenant using the service-role client, or post
arbitrary reply bodies into `touch` through the inbound webhook.

**Recommendation:**
1. Fail closed on a missing secret in both routes:
   `const secret = process.env.CRON_SECRET; if (!secret || header !== \`Bearer ${secret}\`) return 401;`
2. Use `crypto.timingSafeEqual` over equal-length buffers for the comparison.
3. Confirm in the Vercel dashboard which environments carry `CRON_SECRET` and
   `INBOUND_WEBHOOK_SECRET`, and record the answer in `docs/deploy-setup.md`.
4. Consider having the cron refuse to run at all when `NODE_ENV` is production and
   the secret is absent, so a misconfiguration is loud.

---

## F-006: The only public write path has no abuse control of any kind (Medium / Security & Compliance)

**Verification:** STATIC-ONLY

**Evidence:**
- `src/app/c/[slug]/page.tsx:17-41`. The capture server action calls
  `public_capture()` with no rate limit, no CAPTCHA, no honeypot field and no
  origin check.
- `supabase/migrations/0001_schema.sql:228-260`. `public_capture()` is
  security-definer, granted to `anon`, and inserts a `contact` plus a
  `stage_change` for any valid slug. It validates that phone or email is present;
  it does not validate that either is well-formed.
- `src/app/c/[slug]/page.tsx:26`. Email detection is `contactInfo.includes("@")`.
- Dependency scan confirms no rate-limiting library and zero rate-limit code in
  `src/`.
- `src/lib/slug.ts:11-13`. Four characters from a 31-character alphabet, roughly 20
  bits, appended to a predictable name stem. See F-020.

**Impact:** This is the front door of the product, printed on a QR code and left on
a table, so it must be open. What it lacks is any way to distinguish a person from
a script. An attacker who discovers or guesses one slug can inject unlimited
contacts into an agency's funnel. The damage is not a breach; it is the ledger.
Cost per licensed home, the number the README calls the screen that closes the
sale, has capture counts in its denominators, and there is no bulk-delete path
because contacts are erased one at a time through `delete_contact()`. Junk capture
also feeds the nurture cron, which then emails whatever addresses were submitted,
putting the sending domain's reputation at risk before the first genuine campaign.

**Recommendation:**
1. Add a rate limit keyed on IP and slug at the capture action. Upstash Ratelimit or
   a Postgres counter table both fit the existing stack; the latter avoids a new
   vendor.
2. Add a hidden honeypot input and a minimum time-on-page check. Cheap, no user
   friction, and effective against unsophisticated scripts.
3. Validate shape before insert: a real email pattern, or digits-only for a phone.
   Push the check into `public_capture()` so it holds for every caller.
4. Add a per-source daily capture ceiling that creates a task instead of silently
   accepting, so a burst is visible to the recruiter.
5. Consider deleting the "still warm" and cost figures from any source flagged as
   suspect, rather than letting one bad event poison a whole ledger.

---

## F-007: The inbound webhook resolves contacts across every tenant, by pattern match (Medium / Security & Compliance)

**Verification:** STATIC-ONLY. Cross-references BUG-003.

**Evidence:**
- `src/app/api/webhooks/inbound/route.ts:21-25`. The lookup uses the service-role
  client (RLS bypassed), matches with `.ilike("email", from.trim())`, and applies no
  `agency_id` filter.
- `ilike` treats `%` and `_` as wildcards, and `from` comes from the request body.
- `docs/ai/architecture.md:80` already records "Inbound reply matching is by
  from-address `ilike`, breaks on aliases/forwarders" as a known constraint, but
  frames it as a matching-quality issue rather than a tenancy one.

**Impact:** One person can plausibly be in two agencies' contact lists, since a
prospective foster parent may approach more than one. When they reply, the body of
their message, a task, and an automation pause land in whichever tenant PostgREST
returns first. The touch table is append-only, so a misfiled reply cannot be
removed except by erasing that contact entirely. This is the only query in the
codebase that runs outside the RLS boundary without re-imposing a tenant filter in
code, which makes it the exception that F-013 warns about.

**Recommendation:**
1. Replace `ilike` with an exact match on a normalized lowercase generated column,
   which removes both the wildcard behavior and the alias fragility.
2. Carry the tenant in the address: per-agency reply addresses or a signed token in
   `Reply-To`, then filter the lookup by that `agency_id`. This is the real fix.
3. Handle multiple matches explicitly rather than letting `maybeSingle()` swallow
   them into a silent no-match.
4. Add a smoke-test assertion: two agencies, same contact email, one inbound
   payload, and the touch must land in the right tenant.

---

## F-008: There is no CI, so every quality gate is a command run by hand on one machine (Medium / Operational Readiness)

**Verification:** VERIFIED

**Evidence:**
- No `.github/workflows/`, no `.gitlab-ci.yml`, no CI configuration of any kind in
  the repository.
- `package.json:5-10`. Scripts are `dev`, `build`, `start`, `lint`. No `test`, no
  `typecheck`, no `verify`.
- The five verification suites (`smoke-test`, `cron-test`, `anon-audit`,
  `demo-test`, plus `purge-test-agencies`) live in `scripts/*.mjs` and are
  reachable only through `scripts/README.md`.
- They require a live `.env.local` with a service-role key and create and destroy
  real database records, so they cannot run against the pilot database and cannot
  run in CI as written.
- `docs/ai/tasks.md:37` records this and names the blocker: a throwaway Supabase
  project.
- No branch protection: 33 of 34 commits went straight to `main`.

**Impact:** The suites are the best thing in this repository. `anon-audit.mjs` has
caught two real security holes that nothing else would have, by the maintainer's
own record, and migration 0010 exists because it caught the second one. That value
is entirely contingent on somebody remembering to run it. F-003 is precisely the
kind of defect the suites would catch if they ran on every change and if their
coverage were extended. As long as verification depends on discipline rather than
mechanism, the strongest control in the product is also the most fragile.

**Recommendation:**
1. Create a throwaway Supabase project for CI. This is the unblocking step and
   nothing else moves without it.
2. Add a GitHub Actions workflow on pull request: `npm ci`, `npx tsc --noEmit`,
   `npm run lint`, `npm run build`, `npm audit --audit-level=high`. Those four need
   no database and can land today, before the throwaway project exists.
3. Add the four suites as a second job once the throwaway project is in place, with
   its credentials in repository secrets.
4. Add `test`, `typecheck` and `verify` scripts to `package.json` so the suites are
   discoverable from the manifest rather than only from a README.
5. Protect `main`: require the workflow to pass. At one contributor this is a
   speed bump, not a review gate, and it is the right speed bump.

---

## F-009: The setup instructions reference a file the repository does not contain (Medium / Operational Readiness)

**Verification:** VERIFIED

**Evidence:**
- `README.md:96`, step 2 of Setup: "copy `.env.example` to `.env.local` and fill in
  the Supabase URL, anon key and service-role key."
- `.gitignore:34` is `.env*`, with no negation. `git check-ignore -v .env.example`
  confirms line 34 matches it.
- `git ls-files` returns nothing matching `env`. The file exists on disk with
  placeholders only, and has never been tracked in any of the 34 commits.

**Impact:** A fresh clone cannot follow the documented setup, and the missing file
is precisely the one listing which variables the app needs. There are at least
seven (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`, `RESEND_API_KEY`, `EMAIL_FROM`,
`CRON_SECRET`, `INBOUND_WEBHOOK_SECRET`), several with non-obvious behavior:
`docs/ai/architecture.md:81` notes that `NEXT_PUBLIC_APP_URL` is inlined at build
time, so setting it in the dashboard does nothing without a rebuild. Today the
maintainer holds that list. It is the clearest bus-factor item in the repository
and takes one line to fix.

**Recommendation:**
1. Change `.gitignore:34` to `.env*` followed by `!.env.example`.
2. Commit the existing placeholder file after confirming it holds no real values.
3. Add a one-line comment per variable, including which are build-time inlined and
   which are only needed for email.

---

## F-010: Production system secrets are at rest inside a cloud-synced folder (Medium / Security & Compliance)

**Verification:** VERIFIED

**Evidence:**
- The repository path is `C:\Users\Perry\Dropbox\PC\Documents\GitHub\Foster-Care`,
  inside a Dropbox-synced tree.
- `.env.vercel.local` holds live production values for `CRON_SECRET` and
  `INBOUND_WEBHOOK_SECRET`, generated 2026-07-26.
- `.env.local` holds `SUPABASE_SERVICE_ROLE_KEY`, which bypasses RLS entirely and
  can read and write every tenant's data.
- Both are correctly gitignored and neither has ever been committed. Git history is
  clean.

**Impact:** `.gitignore` protects against the repository. It does nothing about the
sync client, which uploads these files to Dropbox's servers, retains version
history, and exposes them to any device or shared-folder participant on that
account. The service-role key is the highest-value credential in the system: it is
the one thing the entire RLS architecture is designed to make unnecessary
elsewhere. This is a storage-location decision rather than a code defect, and it is
worth an explicit choice rather than a default.

**Recommendation:**
1. Now that the values are in Vercel, delete `.env.vercel.local`. Its own header
   says to keep or delete it; deleting removes the only at-rest copy of the
   production system secrets.
2. Move the working copy of the repository outside the Dropbox tree, or add the
   `.env*` files to Dropbox's selective-sync exclusions.
3. If the keys have been synced for any length of time and that is judged
   unacceptable, rotate the Supabase service-role key. It is a one-click operation
   in the Supabase dashboard plus a Vercel variable update.
4. Add gitleaks as a pre-commit hook so the git-history record stays clean by
   mechanism rather than by care.

---

## F-011: Nothing reports an error, and nothing notices when the daily cron does not run (Medium / Operational Readiness)

**Verification:** VERIFIED

**Evidence:**
- No Sentry, no Bugsnag, no OpenTelemetry, no logging library in `package.json`.
- `src/app/error.tsx:13` and `src/app/(app)/error.tsx:15` call `console.error` and
  nothing else. A client-side exception is not captured anywhere.
- `src/app/api/cron/tick/route.ts` returns a stats object but writes no record of
  the run. There is no `cron_run` table, no heartbeat and no alert.
- Errors inside the tick's loops are largely discarded: the task insert at line 44
  (BUG-004), the `wake_up_fired_at` update at line 52, the `touch` insert at
  `src/lib/send.ts:124`.
- `vercel.json` schedules the tick at 15:00 UTC daily. Vercel surfaces a failed
  invocation in its dashboard, but nothing pushes that anywhere.

**Impact:** All of Porchlight's automation is one HTTP request per day. If it stops,
wake-ups do not fire, nurture stops, and cold flags stop. Every one of those
failures looks identical to a quiet week, and the product's whole argument is that
it remembers people the agency would otherwise forget. A silently dead cron is the
worst possible failure for this specific product, and today nothing would detect it
except a person noticing an absence.

**Recommendation:**
1. Add a `cron_run` table: timestamp, duration, the stats object, and any error.
   One insert at the end of the tick. This is the cheapest version and needs no
   vendor.
2. Surface the last successful run somewhere in the UI, for example on `/tasks`, so
   a stale heartbeat is visible to the person who would care.
3. Wrap the tick body in try/catch, record the failure, and return a non-200 so
   Vercel's own alerting has something to fire on.
4. Add Sentry (or equivalent) for both server and client. The free tier covers a
   pilot, and the error boundaries already exist as the hook points.
5. Stop discarding error results inside the loops. BUG-004 is one concrete
   consequence of that habit.

---

## F-012: Service-role capability is reachable from a public unauthenticated route (Medium / Design & Abstraction)

**Verification:** STATIC-ONLY

**Evidence:**
- `src/app/u/[id]/page.tsx:1,11`. The unsubscribe page, which has no authentication
  and is exempted by `src/proxy.ts:43`, imports and calls `createAdminClient()`.
- `src/lib/admin.ts:1-12` is guarded by `server-only`, which prevents it reaching a
  client bundle but places no restriction on which server route may use it.
- ADR-012 states the guarantee as: "`SUPABASE_SERVICE_ROLE_KEY` no longer appears
  anywhere under `src/app`." That is literally true (grep confirms the env var
  appears only in `src/lib/admin.ts`), and the capability it names is nonetheless
  present under `src/app` through the import.
- Grep for `createAdminClient` across `src/` returns four call sites: the cron, the
  inbound webhook, `src/lib/send.ts`, and this page. The first three are system
  paths behind a shared secret. The fourth is open to the internet.

**Impact:** The rule as written is a string check, and a string check is exactly the
kind of rule that stays green while the property it stood for erodes. The concrete
exposure today is bounded: the unsubscribe page reads one contact by primary key and
writes three consent columns. But it is a route any stranger can hit, holding a
client that can read and write every tenant, and a future edit to that file inherits
that reach with nothing objecting. This is the same class of problem ADR-012 was
written to close, reappearing one layer down.

**Recommendation:**
1. Restate the ADR-012 invariant in terms of capability rather than spelling: no
   route under `src/app` may import `createAdminClient` except the two system
   endpoints. Then enforce it with an eslint `no-restricted-imports` rule scoped by
   path, so it is checked rather than remembered.
2. Give the unsubscribe path its own narrow door, matching the pattern the rest of
   the schema uses: a security-definer `public_unsubscribe(p_contact_id uuid)` RPC
   granted to `anon`, which sets the three columns and nothing else. The page then
   uses the anon client and holds no privileged capability at all.
3. That change composes with F-004: the POST handler calls the RPC.
4. Add an `anon-audit` assertion for the new function, per ADR-007's rule that every
   new public-schema function is revoked from `anon` by name unless deliberately
   granted.

---

## F-013: Tenant scoping has exactly one enforcement layer, and app code adds none (Medium / Design & Abstraction)

**Verification:** STATIC-ONLY

**Evidence:**
- `src/app/(app)/contacts/actions.ts:55`, `:71-78`, `:89-94`, `:102-105`, `:133-139`.
  Five writes of the form `.from(table).update({...}).eq("id", id)` where `id` comes
  straight from `FormData`. None filters on `agency_id`. Correctness depends wholly
  on the RLS policy.
- The single point of resolution is `current_agency_id()`
  (`0001_schema.sql:194-197`), reading one column of one row, which F-003 shows is
  writable by the user it describes.
- `src/app/(app)/settings/team/actions.ts:39` is the one action that does add
  `.eq("agency_id", user.agencyId)` in code, so the pattern exists but is not
  applied consistently.
- ADR-001 names the risk precisely: "RLS bugs are silent data leaks, must be tested,
  not assumed." The testing side of that bargain is `scripts/smoke-test.mjs`, which
  cannot run in CI (F-008).

**Impact:** The design is coherent and defensible: put the invariant in one place,
in the database, and test it. It is the same reasoning as ADR-002 and it is a better
choice than scattering checks through handlers. The cost is that there is no second
layer. A single mis-written policy, a single `for all` without a `to authenticated`
clause (the exact defect migration 0010 fixed), or a single writable column in
`app_user` converts directly into cross-tenant access with nothing in the
application to slow it down. Two such defects have already been found and fixed by
the anon audit, which is evidence both that the risk is real and that the chosen
control works when it runs.

**Recommendation:**
1. Treat this as a deliberate trade-off to keep, not a flaw to refactor away. The
   right response is to strengthen the test side, not to duplicate checks.
2. Make the suites run automatically (F-008). The design assumes verification; the
   verification currently assumes a human.
3. Extend `smoke-test.mjs` coverage from "can agency A read agency B's rows" to
   "can agency A become agency B", which is the gap F-003 sits in.
4. Adopt `.eq("agency_id", user.agencyId)` uniformly in server actions as
   belt-and-braces. It costs one clause per query, it makes the intent legible at
   the call site, and it turns a policy regression from a leak into an empty result.

---

## F-014: The send layer is documented as channel-agnostic but is email-shaped at every seam (Medium / Design & Abstraction)

**Verification:** STATIC-ONLY

**Evidence:**
- ADR-003 records the decision as "ship nurture on Resend email only, with a
  channel-agnostic send layer (`src/lib/send.ts`) so SMS drops in later", and lists
  the positive consequence as no external blocker to the pilot.
- `src/lib/send.ts:45-49`. The exported function is `sendNurtureEmail`, taking a
  `NurtureContact` and a `Template`.
- Email specifics are woven through the body rather than isolated: the consent check
  reads `contact.consent_email` only (line 54); the provider guard reads
  `RESEND_API_KEY` and `EMAIL_FROM` (line 63); `channel: "email"` is a literal in
  both the `send_log` claim (line 82) and the `touch` insert (line 128); the
  `Resend` client is constructed inline (line 98); the unsubscribe URL and
  `List-Unsubscribe` header are email transport concerns (lines 92, 105); and the
  success write targets `last_nurture_at` with no channel dimension (line 133).
- `src/app/api/cron/tick/route.ts:100`, `:135`. Both call sites name the function
  directly and pass a `Template` typed with `subject` and `body`, where `subject`
  has no SMS analogue.
- The genuinely channel-agnostic parts (the dedupe claim, the pause check, the
  opt-out check, the demo-tenant block) are real and valuable, and they are the
  parts ADR-004 and ADR-010 depend on.

**Impact:** The seam ADR-003 claims exists as a comment, not as a signature. Adding
SMS means one of two things: a parallel `sendNurtureSms` that re-implements the
consent gate, the idempotency claim, the pause check and the demo block, which is
exactly the duplication ADR-004 says must never happen ("all future channels must
route through this layer, no shortcuts"); or rewriting `sendNurtureEmail` in place
and touching both call sites, the `Template` type, and the consent logic. Neither is
large today. The concern is that ADR-003 records the cost as already paid, so the
next person planning the Twilio work (`docs/ai/roadmap.md:43`) will budget for
dropping SMS in rather than for building the seam first.

**Recommendation:**
1. Rename to `sendNurture(contact, template, dedupeKey, channel)` and thread
   `channel` through the `send_log` and `touch` writes, replacing the two literals.
2. Extract the transport behind a small interface: one function per channel taking a
   rendered message and returning success or failure. The consent, dedupe, pause and
   demo gates stay in the shared body, which is what ADR-004 actually promises.
3. Derive the consent column from the channel rather than hardcoding
   `consent_email`. `contact.consent_sms` already exists in the schema and is
   already set by both capture paths, so the data side is ready.
4. Amend ADR-003 to say the send layer is single-channel today and what specifically
   has to change for a second one. An ADR that overstates a seam is worse than one
   that names the debt.
5. Do this before the Twilio A2P registration completes, not after. It is a
   contained refactor now and a migration under deadline later.

---

## F-015: A parser dependency is pinned to a vendor CDN outside the registry (Low / Operational Readiness)

**Verification:** VERIFIED

**Evidence:**
- `package.json:31`. `"xlsx": "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz"`.
- `package-lock.json` does record an integrity hash, so `npm ci` verifies the
  download and a swapped tarball would fail the install.
- `npm audit` has no advisory data for tarball-sourced packages, and Dependabot and
  Renovate cannot see or bump it.
- Used by one script, `scripts/az-stats-import.mjs`, on workbooks the maintainer
  downloads by hand. Never bundled, never exposed to user input.

**Impact:** Tamper resistance is intact; availability and monitoring are not. If
`cdn.sheetjs.com` is unreachable or the versioned path is retired, every clean
install fails, including a future CI job. SheetJS left the public registry at 0.18,
so this is the vendor's sanctioned path rather than a mistake, and the exposure is
bounded by the devDependency scope.

**Recommendation:**
1. Accept it, and write down why in `docs/ai/decisions.md` so the next reader does
   not re-litigate it.
2. Vendor the tarball into the repository (roughly 800 KB) or a private registry
   proxy if a clean install failing is unacceptable once CI exists.
3. Set a calendar reminder to check SheetJS advisories at each twice-yearly Arizona
   data refresh, since automated tooling will not.

---

## F-016: No tag or release marks what is running in production (Low / Git Hygiene)

**Verification:** VERIFIED

**Evidence:**
- `git tag` returns nothing across 34 commits and five completed milestones.
- The application is live at `porchlightfostercare.org` (`docs/ai/roadmap.md:50`).
- The only marker is the merge commit subject, `ecd14ee` "Merge Milestone 5,
  client-ready".

**Impact:** A rollback has no target, and "which version is the design partner
seeing" has no answer beyond a commit hash someone has to remember. Cheap to fix,
and the value shows up on the first bad deploy.

**Recommendation:**
1. `git tag -a v0.5.0 -m "Milestone 5, first production deploy" 980985b` and push it.
2. Tag each subsequent deploy. Record the current tag in `docs/deploy-setup.md`.

---

## F-017: Four bootstrap commits are too large to bisect or revert (Low / Git Hygiene)

**Verification:** VERIFIED

**Evidence:**
- `b889467` "Milestone 0" is 28 files and 7,778 insertions. `79a6417` "Milestone 1"
  is 13 files and 1,060. `6cb8bb7` and `c43dded` follow the same shape.
- Together they are the majority of week 28's 11,011 changed lines.
- Every commit after them is well-scoped, so this is a bootstrap-period artifact
  rather than an ongoing habit.

**Impact:** The foundational schema, RLS policies and auth wiring arrived in single
revisions, so `git bisect` cannot isolate a defect introduced there, and none of
those commits can be reverted independently. The affected code is the security
spine. This is historical and unfixable without a rewrite, which is not warranted.

**Recommendation:**
1. Do not rewrite history. The cost exceeds the benefit at this size.
2. Keep the current slice-sized commit discipline, which is already good.
3. If a defect is ever traced into the bootstrap commits, treat the migration files
   as the unit of history rather than the commits.

---

## F-018: Lint output is dominated by harness noise, and three escape hatches are unreviewed (Low / Code Quality)

**Verification:** VERIFIED

**Evidence:**
- `npm run lint` exits 0 with 86 warnings and 0 errors. All 86 are
  `@typescript-eslint/no-unused-expressions`, and all 86 are in `scripts/*.mjs`
  (57 in `smoke-test.mjs`, 14 in `anon-audit.mjs`, 10 in `cron-test.mjs`, 5 in
  `demo-test.mjs`). They come from the harness's bare-assertion idiom, not from
  defects. `src/` is completely lint-clean.
- `eslint.config.mjs` re-declares `globalIgnores` with the config's own defaults,
  which replaces rather than extends them, which is why `scripts/` is linted at all.
- `"lint": "eslint"` has no `--max-warnings 0`, so warnings can accumulate
  unnoticed.
- Three suppressions worth a second look:
  `src/components/ContactSearch.tsx:24` (`react-hooks/exhaustive-deps`, the classic
  stale-closure source), `src/app/(app)/contacts/[id]/page.tsx:77-78` (the
  codebase's only `as any`, casting Supabase query results into a prop), and
  `src/lib/arizona.ts:82` (`SupabaseClient<any>`, conventional and low-risk).
- Zero `@ts-ignore` and zero `@ts-expect-error` anywhere.

**Impact:** An 86-to-0 warning-to-error ratio trains the reader to skim lint output,
which is how the first real warning gets missed. The three suppressions are each
contained and none is a defect today.

**Recommendation:**
1. Add `scripts/**` to `globalIgnores`, or add an override there setting
   `no-unused-expressions` to off with a comment explaining the assertion idiom.
2. Then change the script to `eslint --max-warnings 0`, so the count stays at zero
   by mechanism.
3. Review `ContactSearch.tsx:24` specifically: confirm the omitted dependency cannot
   go stale, and record why in a comment next to the suppression.
4. Replace the `as any` with a narrow interface for the `sends` shape.

---

## F-019: The proxy's env-missing branch does not do what its comment says (Low / Code Quality)

**Verification:** STATIC-ONLY. Cross-references BUG-006.

**Evidence:**
- `src/proxy.ts:7-11`. The comment reads "serve public pages and send everything
  else to /login rather than crashing every request." The branch returns `response`
  unconditionally for every path.
- The public-path test at lines 39-45 sits below the early return and is never
  reached in that state.
- `src/lib/supabase/server.ts:6-8` then constructs a client with an undefined URL,
  which throws, landing on the error boundary rather than `/login`.

**Impact:** Small and contained. The goal of commit `d17a6d9`, that a deploy without
Supabase configured still renders the landing page rather than 500ing everywhere, is
met. The gap is between the stated behavior and the actual one, which is the kind of
drift that becomes a wrong assumption for the next reader.

**Recommendation:**
1. Hoist the `isPublic` test above the env check and redirect non-public paths to
   `/login` in that branch, matching the comment.
2. Or adjust the comment to describe what the code does. Either is fine; the two
   disagreeing is not.

---

## F-020: Capture slugs carry roughly 20 bits of entropy, with modulo bias (Low / Security & Compliance)

**Verification:** STATIC-ONLY

**Evidence:**
- `src/lib/slug.ts:1-14`. Four random characters drawn from a 31-character alphabet,
  appended to a slugified source name, giving about 923,000 combinations
  (roughly 19.8 bits) on a predictable stem.
- `ALPHABET[b % ALPHABET.length]` where `b` is a byte 0 to 255. 256 is not a
  multiple of 31, so the first eight characters of the alphabet are drawn about 3.5
  percent more often than the rest. A minor reduction on already-modest entropy.

**Impact:** Slugs are printed on QR codes and posted publicly, so they are not
secrets and the page discloses nothing. The consequence is enumerability of the
write path, which is what makes F-006 practical rather than theoretical: a name stem
is often guessable ("spring-fair-2026"), and the four-character tail is brute
forceable in minutes against an endpoint with no rate limit.

**Recommendation:**
1. Widen to 8 characters (about 40 bits) and use rejection sampling instead of
   modulo. Both are a few lines in `makeSlug`.
2. Existing slugs can stay; this only affects newly created sources.
3. The load-bearing fix is F-006. Entropy raises the cost of finding a slug; rate
   limiting caps the damage once one is found.

---

## F-021: Verification gaps and areas confirmed clean (Informational)

**Verification:** mixed, stated per item.

**Confirmed clean (VERIFIED):**
- Secret scan across all 34 commits and all refs found nothing. No `.env`, key,
  keystore or credential file has ever been added, not even once and reverted. No
  dangling or unreachable objects, no stashes.
- `npx tsc --noEmit` exits 0 with `strict: true` and no strict-family flag disabled.
- `npm run build` exits 0, 24 routes, no warnings.
- Zero debug logging in `src/`. Zero `TODO`, `FIXME`, `HACK` or `XXX` markers.
- No force-push, rebase or reset in any reflog entry.
- The open-redirect surface on the sign-in path is correctly closed in both places
  (`src/app/login/page.tsx:22`, `src/app/auth/callback/route.ts:10`).

**Not verified, and why:**
- **The five suites were not run.** They require live Supabase service credentials
  and create and destroy real records. The maintainer's record (`docs/ai/tasks.md:13`)
  is smoke 59/59, cron 10/10, anon-audit 35 safe with 0 exposed, demo-test 5/5, as
  of 2026-07-26. This audit accepts that as reported rather than reproduced.
- **No RLS policy was executed.** Every claim about tenancy in this register is read
  from the migration SQL, not observed against a live database. F-003 in particular
  should be confirmed empirically before it is either fixed or dismissed.
- **The 1,000-row cap (F-002) was not reproduced.** It needs a tenant with more than
  1,000 contacts.
- **No email has ever been sent by this system**, per `docs/ai/tasks.md:28-32`, so
  the entire send path including F-004 is unexercised against a real inbox.
- **Bundle sizes are unavailable.** Next 16 with Turbopack does not print per-route
  First Load JS in this output format.
- **gitleaks and trufflehog are not installed** on this machine. The secret scan
  fell back to git pickaxe and grep across all refs, which is thorough for known
  patterns but weaker on high-entropy strings with no recognizable prefix.
- **Vercel configuration was not inspected.** Which environments carry
  `CRON_SECRET`, whether preview deployments point at the production Supabase
  project, and whether `maxDuration = 300` is permitted on the current plan are all
  unconfirmed. F-005 depends on the first two.

---

## Severity Summary

| Severity | Count | IDs |
|---|---:|---|
| Critical | 0 | none |
| High | 2 | F-002, F-004 |
| Medium | 11 | F-003, F-005, F-006, F-007, F-008, F-009, F-010, F-011, F-012, F-013, F-014 |
| Low | 7 | F-001, F-015, F-016, F-017, F-018, F-019, F-020 |
| Informational | 1 | F-021 |
| **Total** | **21** | |

Two findings were downgraded after checking them against the tools rather than
the code: F-001 High to Low, F-003 High to Medium. Both corrections are recorded
in their entries. **F-002, the 1,000-row cap, is now the highest-severity open
finding and the only High that is not already fixed in code.**

## By dimension

| Dimension | High | Medium | Low | IDs |
|---|---:|---:|---:|---|
| Security & Compliance | 1 | 4 | 1 | F-003, F-005, F-006, F-007, F-010, F-020 |
| Bugs & Stability | 2 | 0 | 0 | F-002, F-004 |
| Operational Readiness | 0 | 3 | 3 | F-001, F-008, F-009, F-011, F-015, F-016 |
| Design & Abstraction | 0 | 3 | 0 | F-012, F-013, F-014 |
| Code Quality | 0 | 0 | 2 | F-018, F-019 |
| Git Hygiene | 0 | 0 | 1 | F-017 |
| Contributor | 0 | 0 | 0 | see `git_analysis.md` section 10 |

## Status since the first issue (2026-07-26)

| Finding | Status |
|---|---|
| F-001 | Bump applied; finding corrected and downgraded to Low |
| F-003 | **Downgraded to Medium after live testing** (hop refused, self-promotion succeeded). Migration 0011 written, **NOT yet applied**. Until it runs, `smoke-test` fails one assertion, `member cannot change their own role: SELF-PROMOTION SUCCEEDED`, which is the suite correctly reporting an open defect |
| F-004 | **Fixed in code.** `/u/[id]` asks on GET and writes on POST; `List-Unsubscribe` now points at a POST-only endpoint with `List-Unsubscribe-Post` per RFC 8058, so real one-click still works and scanners get 405 |
| F-005 | **Fixed.** `verifySystemSecret()` treats a missing secret as a refusal and compares with `timingSafeEqual` |
| F-012 | **Fixed by 0011.** `public_unsubscribe()` replaces the service-role client on the public route. `createAdminClient` now appears nowhere under `src/app` |
| F-016 | Closed. `v0.6.0` tagged at `456d391` and pushed |
| Add-contact gap, source deletion, mobile layout | Shipped in `456d391`, verified at 375px. Not audit findings; reported by the owner from using the product |

**Outstanding before any of F-003, F-004 or F-012 is actually closed:** migration
0011 has not been run. It is forward-only and not idempotent. Apply it once, then
re-run `smoke-test` and `anon-audit`. Until then the code is ahead of the database,
and `public_unsubscribe` does not exist, so the unsubscribe page will fail.

---
generated_by: codebase-audit skill v1.1
generated_on: 2026-07-26
project: C:\Users\Perry\Dropbox\PC\Documents\GitHub\Foster-Care
project_type: node
verification: full
---
