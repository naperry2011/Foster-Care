# Porchlight

Pre-inquiry recruitment for foster care agencies: capture people at the church
fair before they vanish, hold "not yet" gently for years, and trace every
licensed home back to the Saturday it started.

Full product plan: [docs/PLAN.md](docs/PLAN.md).

## Stack

Next.js (App Router) + TypeScript + Tailwind · Supabase (Postgres, RLS, Auth) · Resend (email) · Vercel.

## Setup

1. **Supabase**: create a project at supabase.com, then in the SQL editor run
   `supabase/migrations/0001_schema.sql` followed by `0002_warmth.sql`
   (or `supabase db push` with the CLI).
2. **Env**: copy `.env.example` to `.env.local` and fill in the Supabase URL,
   anon key, and service-role key. `RESEND_API_KEY`/`EMAIL_FROM` are only
   needed for nurture emails; `CRON_SECRET`/`INBOUND_WEBHOOK_SECRET` guard the
   system endpoints.
3. `npm install && npm run dev`
4. Sign in with a magic link, create your agency on `/onboarding`, create an
   event on `/events`, and scan the QR code.

## The rules the code enforces

- A contact's `source_id` is NOT NULL and immutable — no orphan contacts, ever.
- `stage_change` and `touch` are append-only; stages move only through
  `set_contact_stage()`.
- Consent is checked at the send layer (`src/lib/send.ts`), the only path to
  the email provider; sends are idempotent via `send_log`'s unique dedupe key.
- Opt-out is irreversible (DB trigger).
- Every table is agency-scoped with RLS.

## System endpoints

- `GET /api/cron/tick` (daily, Vercel cron, Bearer `CRON_SECRET`): wake-ups,
  stage-keyed nurture, quarterly "not yet" cadence, cold flags.
- `POST /api/webhooks/inbound` (`x-webhook-secret`): inbound email reply →
  pause automation + create a task.
- `/c/[slug]` public capture page · `/u/[id]` one-click unsubscribe.
