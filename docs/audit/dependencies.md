# Dependency Inventory

Project `porchlight` v0.1.0, private. Next.js 16 App Router on Supabase.
Lockfile v3, 477 package entries, 442 total installed packages.

---

## 1. Production dependencies (8 direct)

| Package | Constraint | Resolved | Purpose |
|---|---|---|---|
| `@supabase/ssr` | `^0.12.0` | 0.12.0 | Cookie-based Supabase auth for server components and the request proxy |
| `@supabase/supabase-js` | `^2.110.2` | 2.110.2 | PostgREST, auth and RPC client |
| `next` | `16.2.10` | 16.2.10 | Framework: App Router, server actions, API routes |
| `qrcode` | `^1.5.4` | 1.5.4 | QR generation for capture links |
| `react` | `19.2.4` | 19.2.4 | UI runtime |
| `react-dom` | `19.2.4` | 19.2.4 | DOM renderer |
| `resend` | `^6.17.2` | 6.17.2 | Transactional email, the only outbound provider |
| `server-only` | `^0.0.1` | 0.0.1 | Build-time guard that poisons server modules imported into client bundles |

Production transitive closure: 62 packages, plus 86 optional platform binaries
(`sharp`, SWC). That is a genuinely small surface for a production web app.

## 2. Dev, test and build dependencies (10 direct)

| Package | Constraint | Resolved | Purpose |
|---|---|---|---|
| `@tailwindcss/postcss` | `^4` | 4.3.2 | The only configured PostCSS plugin |
| `@types/node` | `^20` | 20.19.43 | Node typings |
| `@types/qrcode` | `^1.5.6` | 1.5.6 | Typings for `qrcode` |
| `@types/react` | `^19` | 19.2.17 | React typings |
| `@types/react-dom` | `^19` | 19.2.3 | React DOM typings |
| `eslint` | `^9` | 9.39.5 | Linter |
| `eslint-config-next` | `16.2.10` | 16.2.10 | Next core-web-vitals and TypeScript presets |
| `tailwindcss` | `^4` | 4.3.2 | CSS engine |
| `typescript` | `^5` | 5.9.3 | Type checker |
| `xlsx` | tarball URL | 0.20.3 | SheetJS, used only by `scripts/az-stats-import.mjs` |

Dev transitive closure: 380 packages.

## 3. Constraint quality

**Unpinned (`*`, `any`, `latest`): none.** Good.

**Exact-pinned without caret:** `next` and `eslint-config-next` at `16.2.10`,
`react` and `react-dom` at `19.2.4`. Intentional and correct for the framework
triad. The consequence is that the patch releases fixing the advisories in section
5 will not arrive through `npm update`; `package.json` has to be edited by hand.

**Loose majors:** `^4`, `^20`, `^19`, `^5` for Tailwind, the type packages and
TypeScript. Acceptable given the lockfile, but the lockfile is then the only thing
keeping a build reproducible, and there is no CI performing `npm ci`.

**Pre-1.0 packages:** `@supabase/ssr` at 0.12.0 and `server-only` at 0.0.1.
`@supabase/ssr` is the load-bearing one: a caret on a 0.x version resolves as
`>=0.12.0 <0.13.0`, so npm treats a minor bump as a patch, and minor bumps in that
package have historically carried cookie and session-handling changes. It sits
directly on the auth path (`src/lib/supabase/server.ts`, `src/proxy.ts`), so any
upgrade deserves a run of `scripts/anon-audit.mjs` and `scripts/smoke-test.mjs`.
`server-only` at 0.0.1 is a two-line React-team stub; its version number is
cosmetic.

**Tarball-URL dependency: `xlsx` from `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`.**

- The lockfile does record an integrity hash
  (`sha512-oLDq3jw7AcLqKWH2AhCpVTZl8mf6X2YReP+Neh0SJUzV/BdZYjth94tG5toiMB1PPrYtxOCfaoUCkvtuH+3AJA==`),
  so `npm ci` verifies the download and a swapped tarball at that URL would fail
  the install. Tamper resistance is intact.
- What is not intact is availability and auditability. The URL points at a single
  vendor CDN with no registry mirror. If `cdn.sheetjs.com` is down, blocked by an
  egress policy, or the versioned path is retired, every clean install fails.
  `npm audit` has no advisory data for tarball-sourced packages, and Dependabot or
  Renovate cannot see or bump it. `xlsx` has a history of prototype-pollution and
  ReDoS advisories, so an unmonitored parser is the wrong thing to be blind on.
- Mitigating: SheetJS left the public npm registry at 0.18, so this is the vendor's
  sanctioned distribution path rather than a mistake. It is a devDependency used by
  one operator script that parses a workbook the maintainer downloaded themselves,
  never ships in the app bundle, and never sees user-supplied input. The
  reproducibility risk outweighs the security risk here. See F-015.

## 4. Version drift (`npm outdated`)

Patch or minor drift on everything, plus three major gaps:

| Package | Current | Latest | Gap |
|---|---|---|---|
| `@types/node` | 20.19.43 | 26.1.1 | 6 majors. Typings only, but Node 20 is EOL territory; confirm the Vercel runtime |
| `typescript` | 5.9.3 | 7.0.2 | 2 majors |
| `eslint` | 9.39.5 | 10.8.0 | 1 major |

Available without a major bump: `next` and `eslint-config-next` 16.2.10 to
**16.2.12**, `react` and `react-dom` 19.2.4 to 19.2.8, `@supabase/ssr` 0.12.3,
`@supabase/supabase-js` 2.110.8, `resend` 6.18.0, `tailwindcss` 4.3.3.

## 5. Vulnerabilities (`npm audit`)

**12 high, 0 critical, 0 moderate, 0 low.** Three root causes.

**`next` 16.2.10 (direct, production), 9 advisories.** Middleware and proxy bypass
in App Router under Turbopack with a single locale; SSRF in server actions on
custom servers and in rewrites; two response-body cache-confusion issues; denial of
service via server actions and via the SVG image-optimization path; unbounded edge
server-action payloads; and unauthenticated disclosure of internal server-function
endpoints. **All fixed in 16.2.12, a non-breaking patch.**

This is the single highest-value action in the audit. Porchlight's entire
unauthenticated-access boundary is `src/proxy.ts`, so the middleware-bypass
advisory lands directly on the app's auth gate, and the endpoint-disclosure
advisory lands on a multi-tenant app holding named PII. See F-001.

The same bump also clears the transitive advisories in `postcss` (XSS plus two
`sourceMappingURL` path-traversal issues) and `sharp` (four inherited libvips CVEs).

**eslint toolchain, dev only.** `eslint`, `@eslint/config-array`, `@eslint/eslintrc`,
`brace-expansion`, `minimatch`. Clearing these needs an eslint 9 to 10 migration.

**`eslint-config-next` toolchain, dev only.** Plus `eslint-plugin-import`,
`eslint-plugin-jsx-a11y`, `eslint-plugin-react`. npm suggests "fixing" this by
downgrading `eslint-config-next` to 0.2.4; that is resolver noise, ignore it.

**Practical order:** hand-edit `next` and `eslint-config-next` to `16.2.12`, which
clears 11 of 12. The remainder is dev-only and needs a coordinated eslint major.

## 6. Notable absences

| Category | Status | What is used instead |
|---|---|---|
| Test framework | **Absent.** No jest, vitest, playwright or cypress; no `test` script | Seven hand-written ESM scripts under `scripts/`: `smoke-test.mjs` (59 assertions on invariants, RLS isolation and erasure), `anon-audit.mjs` (35 assertions on the anonymous attack surface), `cron-test.mjs` (10), `demo-test.mjs` (5), plus `lib.mjs` and `purge-test-agencies.mjs`. Run manually as `node scripts/<x>.mjs .env.local`, documented in `scripts/README.md`. No runner, no CI wiring, no `npm test` entry point |
| Linter | Present | eslint 9 with `eslint-config-next`, flat config, no rules disabled. Script is `"lint": "eslint"` with no `--max-warnings 0` |
| Formatter | **Absent** | No prettier, no `.editorconfig`. Formatting is convention only, which holds fine at one contributor |
| Error and crash reporting | **Absent** | No Sentry, no Bugsnag, no OpenTelemetry. Vercel runtime logs only. Nothing captures a client-side exception or alerts on a failed cron. See F-011 |
| Validation library | **Absent** | No zod, yup or valibot. Server actions coerce `FormData` by hand with `String(...)`. The database RPCs carry the real validation, which is consistent with ADR-002, but the `/c/[slug]` capture path accepts any string as an email |
| Rate limiting | **Absent** | Zero matches across `src/`. The public capture path and the send path are both unthrottled. See F-006 |
| Auth library | Covered | Supabase Auth plus RLS, deliberately not a separate library (ADR-001) |
| Typecheck in CI | Not scripted | No `typecheck` script; `tsc` runs only inside `next build`. `tsconfig.tsbuildinfo` is present at the repo root and gitignored |
| Git hooks | **Absent** | No husky, no lint-staged, no pre-commit secret scan |

The scripts block is `dev`, `build`, `start`, `lint`. There is no `test`,
`typecheck`, `format` or `verify` entry, so the verification suite (which is the
strongest thing in this repository) is discoverable only by reading
`scripts/README.md`.

## 7. Summary judgment

The dependency surface is small, deliberately chosen, and free of the usual
accumulation. Eight production packages for a multi-tenant CRM is disciplined.

Two things need attention. The framework is one patch release behind a set of
advisories that includes a bypass of its own middleware layer, and that bump is
free. And the verification suite, which is genuinely good, is not reachable from
`package.json` and cannot run without live credentials, so nothing enforces it.

---
generated_by: codebase-audit skill v1.1
generated_on: 2026-07-26
project: C:\Users\Perry\Dropbox\PC\Documents\GitHub\Foster-Care
project_type: node
verification: full
---
