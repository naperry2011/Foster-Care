# The throwaway Supabase project

Why this exists: every verification run so far has written to the database
production uses. The five suites create users, agencies and contacts, then clean
up after themselves — and they have always worked. But "works every time so far"
is not a property you want protecting a real agency's families, and it is the
reason the suites still are not in CI: nobody wants a pull request writing to
the database The Greenhouse will be in.

A second project fixes both. It also unblocks `.github/workflows/suites.yml`,
which is written and waiting for the secrets below.

**One-time setup, about twenty minutes.**

---

## 1. Create the project

app.supabase.com → New project.

- Name: `porchlight-test` (anything, as long as nobody can confuse it with
  `ygryunmvgyuqjxkumbmu`, which is production)
- Region: same as production, so latency-dependent assertions behave the same
- Database password: generate one and **save it** — unlike production, you want
  to be able to use the CLI against this project

The free tier is enough. It pauses after a week of inactivity, which is fine:
the next CI run wakes it, at the cost of a slow first request.

## 2. Apply the schema

Thirteen migrations, in order. Do not paste them one at a time — a
half-applied schema fails the suites in ways that look like product bugs.

```bash
node scripts/bundle-migrations.mjs > porchlight-schema.sql
```

That writes every migration in order, wrapped in a single transaction, so a
failure anywhere leaves the project empty rather than half-built. It refuses to
run if a migration number is missing.

Paste the whole file into the new project's SQL editor and run it.

**This is for an empty project only.** The migrations are forward-only and not
idempotent; running the bundle against production would destroy data. Delete
`porchlight-schema.sql` when you are done — it is gitignored, but it is easier
not to have it lying around.

## 3. Confirm the schema landed

```bash
cp .env.local .env.test
```

Then edit `.env.test` and replace the three Supabase values with the new
project's (Settings → API):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

**Delete the `RESEND_API_KEY` line.** Without a provider `sendNurtureEmail()`
returns `"skipped"` and claims no dedupe key, so nothing can be emailed from
here even if a suite seeds a consenting contact. That is the guarantee that
makes this project safe to point anything at.

`.env.test` is gitignored alongside `.env.local`.

Then:

```bash
node scripts/anon-audit.mjs .env.test
node scripts/smoke-test.mjs .env.test
```

Expect `39 safe, 0 exposed` and `62/62`. If the numbers differ from production,
the schema did not apply cleanly — drop the project and start again rather than
debugging a partial paste.

## 4. Put the keys in GitHub

Repo → Settings → Secrets and variables → Actions → New repository secret:

| Secret | Value |
|---|---|
| `TEST_SUPABASE_URL` | the new project's URL |
| `TEST_SUPABASE_ANON_KEY` | its anon key |
| `TEST_SUPABASE_SERVICE_ROLE_KEY` | its service-role key |

`.github/workflows/suites.yml` skips itself and passes while these are absent,
so it goes from "no-op" to "running" the moment all three exist. Nothing else
needs changing.

**Never put production's keys in these.** The whole point is that a pull
request cannot reach the database an agency's families are in.

## 5. Prove it

Open any pull request, or push to `main`. The **Suites** check should run
anon-audit, smoke, demo, ledger-parity, then build the app and run cron-test
against it.

---

## Afterwards

- The five suites now guard every pull request instead of running when somebody
  remembers.
- `.env.test` is the right target for anything experimental. Point scripts at it
  rather than `.env.local` unless you specifically mean production.
- The test project drifts the moment a migration is applied to one and not the
  other. Apply new migrations to **both**, and prefer the test project first —
  that is the cheap place to find out a migration does not apply cleanly.
