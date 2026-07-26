# Architecture

System design at a glance. Pair with docs/PLAN.md (product plan) and the migration files (authoritative schema).

## System Overview

Porchlight is a multi-tenant **Next.js 16.2** (App Router) monolith on Vercel backed entirely by Supabase. Pilot scale: a handful of agencies, thousands of contacts. All automation is a single daily cron; there is no queue, no workers, no second service.

**Style:** Monolith (server components + server actions + 3 API routes)
**Hosting:** Vercel + Supabase managed Postgres

### Next 16 specifics that constrain the code
- The request-proxy file is `src/proxy.ts` exporting `proxy()` — `middleware.ts` is the deprecated name.
- `cookies()`, `params` and `searchParams` are Promise-only; there is no synchronous shim.
- `error.tsx` receives `unstable_retry`, not `reset`.
- Turbopack is the default for dev *and* build; `next lint` is gone (we run `eslint` directly).
- Vendored docs live at `node_modules/next/dist/docs/` — consult them before writing App Router code (AGENTS.md mandates this).

## Core Components

### Web app (`src/app/`)
- **Responsibility:** everything user-facing. `/` = landing (signed out) or dashboard, so it sits *outside* the route group and renders the shell itself. Everything else authed lives in the **`(app)` route group**, whose single layout calls `requireUser()` once and wraps children in `AppShell`: `/board`, `/contacts`, `/contacts/[id]`, `/events`, `/events/[id]`, `/tasks`, `/ambassadors`, `/ledger`, `/ledger/backfill`, `/settings`, `/settings/demo`. Public: `/c/[slug]` capture, `/u/[id]` unsubscribe, `/login`, `/onboarding`.
- **Tech:** React server components; server actions for writes; Tailwind v4 tokens in `globals.css`; fonts Fraunces (display) / Karla (body) / Caveat (handwritten).
- **Key files:** `src/components/AppShell.tsx`, `AccountMenu.tsx` (sign-out), `ContactTimeline.tsx`, `StageSelect.tsx`, `src/components/ui/*` (shared primitives; `Cited` enforces provenance), `src/lib/auth.ts` (`requireUser` → `CurrentUser` incl. `isDemo`), `src/lib/timeline.ts` (merges four append-only sources into one story), `src/proxy.ts`.

### Demo agency (`src/lib/demo/`)
- **Responsibility:** a complete 18-month recruitment history for sales demos, in its own `is_demo` tenant. Fixed PRNG seed → identical every rebuild.
- **Guards:** `delete_demo_data()` refuses non-demo agencies; `send.ts` refuses to send from a demo agency and fails closed. See ADR-010.

### Data layer (`supabase/migrations/`)
- **Responsibility:** schema AND business invariants (see decisions.md ADR-002).
- **Spine:** `agency` → `app_user`, `source` (slug = capture URL), `contact` (immutable `source_id`, stage enum, `wake_up_on`, consent flags), `touch`, `stage_change` (append-only), `outcome`, `nurture_template` (NULL agency = global default), `send_log` (idempotency), `task`.
- **RPCs:** `set_contact_stage()` (only way to move stages), `public_capture()` (only anon write path), `current_agency_id()` (RLS helper).

### Automation (`/api/cron/tick` + `src/lib/send.ts`)
- **Responsibility:** wake-ups → tasks; stage-keyed nurture (curious/considering, one email per contact per tick); quarterly not_yet cadence; 30-day cold flags. `send.ts` is the single gate to Resend.
- **Depends on:** service-role client (`src/lib/admin.ts`) — bypasses RLS, server-only.

### Inbound (`/api/webhooks/inbound`)
- **Responsibility:** email reply → pause automation, log touch, create task.

## Data Flow (Critical Path)

1. Recruiter creates event → `source` row + slug → QR to `/c/[slug]`
2. Visitor submits → `public_capture()` RPC → `contact` (stage curious, source stamped) + `stage_change`
3. Cron nurtures / waiting room holds (`wake_up_on`) → tasks for humans
4. Stage → licensed via `set_contact_stage()` → `outcome` row
5. `/ledger` aggregates source → captured/warm/inquiries/licensed/lag/cost-per-home

## Data Stores

- **Supabase Postgres** — everything. No cache, no object store.

## External Integrations

- **Resend** — outbound nurture email (List-Unsubscribe header); inbound reply webhook.
- **Vercel cron** — daily GET `/api/cron/tick` (Bearer `CRON_SECRET`), `vercel.json`.

## Security Boundaries

- Supabase Auth magic links; `middleware.ts` gates non-public paths; `requireUser()` re-checks per page.
- RLS on every table scoped by `current_agency_id()`; anon role can only execute `public_capture`.
- Service-role key used only in `src/lib/admin.ts` (`server-only` import guard); system endpoints guarded by shared secrets.
- No child data anywhere, by design (spec §02).

## Known Constraints / Trade-offs

- Cron is daily and loops contacts in TS — fine for pilot scale, revisit at ~10k contacts.
- Inbound reply matching is by from-address `ilike` — breaks on aliases/forwarders.
- `NEXT_PUBLIC_APP_URL` must be set per environment or QR codes point at localhost.
