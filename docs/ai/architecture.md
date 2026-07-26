# Architecture

System design at a glance. Pair with docs/PLAN.md (product plan) and the migration files (authoritative schema).

## System Overview

Porchlight is a multi-tenant Next.js 15 (App Router) monolith on Vercel backed entirely by Supabase. Pilot scale: a handful of agencies, thousands of contacts. All automation is a single daily cron; there is no queue, no workers, no second service.

**Style:** Monolith (server components + server actions + 3 API routes)
**Hosting:** Vercel + Supabase managed Postgres

## Core Components

### Web app (`src/app/`)
- **Responsibility:** everything user-facing. `/` = landing (signed out) or dashboard; `/events`, `/board`, `/contacts`, `/tasks`, `/ambassadors`, `/ledger` behind auth; `/c/[slug]` public capture; `/u/[id]` unsubscribe; `/onboarding` first-run agency creation.
- **Tech:** React server components; server actions for writes; Tailwind v4 tokens in `globals.css`; fonts Fraunces/Karla/Caveat.
- **Key files:** `src/components/Landing.tsx`, `src/components/StageSelect.tsx`, `src/lib/auth.ts` (requireUser), `src/middleware.ts` (session refresh + auth gate; no-ops without env vars).

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
