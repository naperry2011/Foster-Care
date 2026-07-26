# Verification scripts

Run against whatever project `.env.local` points at. **Never point these at a
production agency's data** — they create and erase records.

```bash
node scripts/smoke-test.mjs .env.local   # schema invariants + RLS isolation + erasure
node scripts/cron-test.mjs  .env.local   # /api/cron/tick behavior (dev server must be running)
node scripts/anon-audit.mjs .env.local   # what a stranger with the public anon key can reach
node scripts/demo-test.mjs  .env.local   # demo tenancy guards
node scripts/purge-test-agencies.mjs     # remove agencies left by test runs
node scripts/az-stats-import.mjs         # Arizona figures: dry-run the diff
node scripts/az-stats-import.mjs --apply # ...and write it
```

Run all of them after any migration. `anon-audit` is the one to re-run after
adding any function or RLS policy, and it earns its keep: Supabase's default
privileges grant EXECUTE on every new public-schema function to `anon`, so a
new RPC is exposed to the internet unless you revoke it by name — and a policy
written without an explicit `to authenticated` applies to `anon` too. It has
now caught both mistakes, once each (0004 and 0010).

`smoke-test.mjs` stands up two throwaway agencies with real authenticated
users and asserts the promises the product is built on: attribution is
immutable, history is append-only, stages only move through the RPC, consent
and opt-out hold, one agency can never see or touch another's data, and a
person can be erased on request.

`cron-test.mjs` seeds backdated contacts the UI can't create (a wake-up date
that has arrived, a contact silent for 60 days), hits the live cron endpoint,
and asserts that wake-ups and cold flags fire exactly once and that
unconsented or opted-out people are never sent to.

`dev-session.mjs` is a convenience for manual UI checks: it mints a session for
a throwaway user in an existing agency and prints the auth cookies to paste
into a browser. Local only. Clean up after yourself: the throwaway user cannot
be deleted while anything references it (`agency_invite.invited_by_user_id`,
`journey_step.completed_by_user_id`), so delete those rows first — and check
the `error`, because the delete fails silently otherwise.

`az-stats-import.mjs` is not a test. It is the only writer of `az_stat`, run by
hand twice a year after downloading the DCS workbooks into `az_docs/` — see
`docs/az-data-sources.md`. `dcs.az.gov` returns 403 to every server-side
fetcher, so a human with a real browser is part of the pipeline.
