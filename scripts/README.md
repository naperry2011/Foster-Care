# Verification scripts

Run against whatever project `.env.local` points at. **Never point these at a
production agency's data** — they create and erase records.

```bash
node scripts/smoke-test.mjs .env.local   # schema invariants + RLS isolation + erasure
node scripts/cron-test.mjs  .env.local   # /api/cron/tick behavior (dev server must be running)
```

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
into a browser. Local only.
