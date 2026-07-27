# Bug Log

Reproducible defects, ranked. Every entry cross-references its finding ID in
[`findings.md`](findings.md).

Severity here is operational priority, not the findings-register severity:
**P1** breaks a core promise for real users; **P2** produces wrong data or wrong
behavior under conditions that will occur; **P3** is contained or cosmetic.

---

## BUG-001: Both the ledger and the daily cron stop reading at 1,000 rows (P1)

**Cross-reference:** F-002. **Verification:** STATIC-ONLY.

**Evidence:**
- `src/app/(app)/ledger/page.tsx:20-28`. Four unbounded `select()` calls with no
  `.range()`, no `.limit()`, and no pagination loop, then every figure on the page
  is aggregated in TypeScript from those arrays.
- `src/app/api/cron/tick/route.ts:32-38`, `:73-82`, `:116-125`, `:146-150`,
  `:190-195`. Five more unbounded `select()` calls, each driving a loop that sends
  email or creates tasks.
- Supabase sets PostgREST's `max-rows` to 1,000 by default on hosted projects. A
  query that matches more rows returns the first 1,000 with HTTP 200 and no error,
  no warning, and no truncation flag on the client.

**Repro (not executed; needs a tenant with more than 1,000 contacts):**
1. Seed one agency with 1,200 contacts across two sources.
2. Load `/ledger`. The "Captured" tile and the per-source rows will report roughly
   1,000, not 1,200, with no indication anything was dropped.
3. Set `wake_up_on` to today on contacts ranked beyond the 1,000th row of the
   `stage = not_yet` query and run `/api/cron/tick`. No wake-up task is created for
   them, and `wake_up_fired_at` stays null, so the tick will not skip them
   permanently, but it also will never reach them while the query stays full.

**Impact.** Two separate promises break silently. The ledger is described in the
README as the screen that closes the sale, and its numbers would be quietly wrong
in front of a board or a funder, with no error to notice. The cron is the mechanism
behind "the date lives in the database, so it survives every deploy"; past the cap,
some contacts simply stop being processed, and nothing in the product says so.

`docs/ai/tasks.md:64` already records the ledger aggregation as tech debt to
address "past ~1,000", but frames it as a performance concern. The failure mode is
not slowness. It is wrong numbers with a 200 response.

**Fix:**
1. Short term, add `.range(0, 9999)` or an explicit paginating loop to every
   unbounded read in the cron and the ledger, and log when a page comes back full.
2. Medium term, move the ledger to a SQL view or an RPC that aggregates in Postgres,
   which removes the cap and the O(sources x contacts) in-memory scan at
   `src/app/(app)/ledger/page.tsx:36` at the same time.
3. For the cron, prefer keyset pagination over offset so a long tick stays correct
   while rows change underneath it.

---

## BUG-002: One-click unsubscribe performs an irreversible write on GET (P1)

**Cross-reference:** F-004. **Verification:** STATIC-ONLY.

**Evidence:**
- `src/app/u/[id]/page.tsx:24-32`. A React server component (rendered on GET) sets
  `opted_out_at`, `consent_email = false` and `consent_sms = false`.
- `supabase/migrations/0001_schema.sql:115-117`. The `forbid_source_change` trigger
  raises on any attempt to change `opted_out_at` once set. The write cannot be
  undone by the recruiter, by support, or by the contact.
- `src/lib/send.ts:105`. The same URL is emitted as a bare `List-Unsubscribe`
  header with no `List-Unsubscribe-Post` companion.

**Repro (not executed; needs a real send):**
1. Send a nurture email to an address behind a scanning gateway (Microsoft Defender
   Safe Links, Proofpoint, Mimecast, or Gmail's prefetcher).
2. The gateway issues a GET against every URL in the message, including
   `/u/<contact-id>`, before the recipient ever opens it.
3. The contact is opted out permanently, and no email will reach them again.

**Impact.** Porchlight's entire thesis is holding a "not yet" warmly for years. A
scanner-triggered opt-out removes that person from the funnel silently and
permanently, and the product's own irreversibility trigger guarantees it cannot be
walked back. The recruiter sees a contact who stopped receiving email and has no
signal distinguishing a real opt-out from a scanner hit. Agency-side link
scanning is standard, so this is likely to fire on the first real campaign rather
than being a theoretical risk.

**Fix:**
1. Make `/u/[id]` render a confirmation page on GET and perform the write in a
   server action on POST. That alone closes the scanner path.
2. Add RFC 8058 support: `List-Unsubscribe-Post: List-Unsubscribe=One-Click`
   alongside the existing header, with a POST endpoint that mail providers call
   directly. This keeps genuine one-click behavior in Gmail and Outlook while
   scanners, which issue GET, cannot trigger it.
3. Consider a short grace window (an `unsubscribe_pending_at` column) before the
   irreversible trigger fires, so a mistaken opt-out has a documented reversal path
   without weakening the invariant.

---

## BUG-003: The inbound webhook matches contacts across every tenant, by pattern (P2)

**Cross-reference:** F-007. **Verification:** STATIC-ONLY.

**Evidence:**
- `src/app/api/webhooks/inbound/route.ts:21-25`. The lookup is
  `admin.from("contact").select(...).ilike("email", from.trim()).maybeSingle()`,
  run on the service-role client, which bypasses RLS and therefore searches every
  agency's contacts at once. There is no `agency_id` filter.
- `ilike` interprets `%` and `_` as wildcards. `from` comes from the request body,
  which is attacker-controlled once the shared secret is known.

**Repro (not executed; needs the webhook secret):**
1. Two agencies each hold a contact at `parent@example.com`, which is ordinary:
   a prospective foster parent may well approach more than one agency.
2. That person replies to a nurture email. The webhook matches whichever row
   PostgREST returns first.
3. The reply body is written into the wrong agency's `touch` table, a task is
   created for the wrong recruiter, and the right one never learns the person
   replied. The touch is append-only, so the misfiled record cannot be removed
   except through full erasure of that contact.
4. Separately, posting `{"from": "%@%"}` makes `maybeSingle()` see multiple rows and
   error out, so the request returns `{"ok": true, "matched": false}` and the reply
   is dropped. Posting a narrower pattern such as `%@agency.org` can steer the
   match to a chosen contact.

**Impact.** Cross-tenant leakage of the body of a reply, which for this product is
a stranger's message about fostering, into an unrelated agency's records. This is
the one place in the codebase where a query intentionally runs outside the RLS
boundary without re-imposing a tenant filter in code.

**Fix:**
1. Escape the pattern, or better, stop using `ilike`. Compare on a normalized
   lowercase column: `.eq("email_lower", from.trim().toLowerCase())` with a
   generated column and index.
2. Resolve the tenant from the message rather than the sender. Use per-agency reply
   addresses (`reply+<agency>@...`) or a signed token in the `Reply-To`, and filter
   the lookup by that `agency_id`.
3. Handle the multi-match case explicitly instead of letting `maybeSingle()` swallow
   it: if more than one row matches, create a task rather than dropping the reply.

---

## BUG-004: A wake-up is marked fired even when its task was never created (P2)

**Cross-reference:** F-002 (same file, different defect). **Verification:** STATIC-ONLY.

**Evidence:**
- `src/app/api/cron/tick/route.ts:44-54`. The result of
  `await admin.from("task").insert({...})` is discarded, and
  `wake_up_fired_at` is then set unconditionally on the next statement.

**Repro (not executed):**
1. Cause the task insert to fail for any reason other than a duplicate key: a
   transient Postgres error, a connection reset mid-tick, or a future constraint.
2. `wake_up_fired_at` is still written.
3. The contact's `wake_up_on` filter at line 37 excludes them from every subsequent
   tick. No task is ever created and no error surfaces; the tick returns
   `{"ok": true}` with an inflated `wakeUps` count.

**Impact.** The waiting room is the product's differentiator, and the wake-up task
is the single moment it delivers value. This defect can consume that moment
silently. The blast radius is one contact per occurrence, but the failure is
permanent and invisible, and the promise it breaks is the one the README leads with.

Note the contrast with the surrounding code: the `outcome_confirm` insert at line
200 does check `error` before incrementing its counter, and `send_log` claims its
dedupe key before sending precisely to avoid this class of problem. The wake-up
path is the outlier, not the pattern.

**Fix:**
1. Capture the insert error. Only write `wake_up_fired_at` when the insert
   succeeded or failed with `23505` (already created).
2. Increment `stats.wakeUps` on the same condition, so the tick's own return value
   stops over-reporting.

---

## BUG-005: Cold-flag tasks have no idempotency key (P3)

**Cross-reference:** F-002 (same file). **Verification:** STATIC-ONLY.

**Evidence:**
- `src/app/api/cron/tick/route.ts:172-177`. The `cold_flag` insert passes no
  `dedupe_key`, unlike `wake_up` at line 48 and `outcome_confirm` at line 203.
- `supabase/migrations/0005_polish.sql:15-16`. The unique index is
  `on task (agency_id, dedupe_key) where dedupe_key is not null`, so a null key
  opts out of protection entirely.
- The guard at lines 160-167 is a read-then-write check, which two overlapping
  ticks can both pass.

**Impact.** Two ticks firing close together (a manual re-run during debugging, or a
platform retry) create duplicate "gone quiet" tasks for the same contact. Migration
0005's own header calls out this exact lesson: "Tasks had no idempotency key, so
any recurring task the cron creates would pile up." The fix was applied to two of
the three task kinds.

**Fix:** pass `dedupe_key: \`cold_flag:${c.id}:${today}\`` (or a coarser window) and
drop the read-then-write check, letting the unique index do the work.

---

## BUG-006: With Supabase env vars absent, authed routes crash instead of redirecting (P3)

**Cross-reference:** F-019. **Verification:** STATIC-ONLY.

**Evidence:**
- `src/proxy.ts:7-11`. The comment states the intent: "serve public pages and send
  everything else to /login rather than crashing every request." The body returns
  `response` for every path, including authed ones.
- `src/lib/supabase/server.ts:6-8`. `createServerClient` is then called with an
  undefined URL and key, which throws, so the request lands on the error boundary
  at `src/app/(app)/error.tsx`.

**Repro:**
1. Deploy or run with `NEXT_PUBLIC_SUPABASE_URL` unset.
2. Request `/board`. Expected per the comment: a redirect to `/login`. Actual: the
   error boundary.

**Impact.** Contained. The landing page and `/login` still render, which is what
commit `d17a6d9` set out to protect, so a fresh deploy does not 500 on every route.
The gap is between the comment and the code, which is the kind of drift that
becomes a wrong assumption later.

**Fix:** in the env-missing branch, apply the same public-path test used at lines
39-45 and redirect non-public paths to `/login`.

---

## Bugs looked for and not found

Recorded so the absence is on the record rather than assumed.

| Check | Result |
|---|---|
| Debug logging left in production paths | Zero `console.log`, `console.debug` or `debugger` in `src/`. The only two `console.error` calls are inside React error boundaries |
| `TODO` / `FIXME` / `HACK` / `XXX` markers | Zero in `src/` |
| Type suppressions | Zero `@ts-ignore`, zero `@ts-expect-error`. One `as any` at `src/app/(app)/contacts/[id]/page.tsx:78` |
| Typecheck | `npx tsc --noEmit` exits 0 with strict mode on |
| Build | `npm run build` exits 0, 24 routes, no warnings |
| Open redirect on sign-in | Correctly closed. Both `src/app/login/page.tsx:22` and `src/app/auth/callback/route.ts:10` reject `//host` alongside absolute URLs |
| Double-send on a re-fired cron | Correctly closed. `send_log` claims the dedupe key before the provider call (`src/lib/send.ts:78-89`) |
| Demo tenant sending real email | Correctly closed and fails closed (`src/lib/send.ts:36`) |
| Secrets in git history | Clean across all 34 commits and all refs |

Two items flagged by static analysis were reviewed and are not bugs: the suppressed
`react-hooks/exhaustive-deps` at `src/components/ContactSearch.tsx:24`, and the
`as any` at `src/app/(app)/contacts/[id]/page.tsx:78`. Both are localized. They are
noted in F-018 as quality items rather than defects.

---
generated_by: codebase-audit skill v1.1
generated_on: 2026-07-26
project: C:\Users\Perry\Dropbox\PC\Documents\GitHub\Foster-Care
project_type: node
verification: full
---
