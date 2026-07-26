# Architecture Decisions

ADR log. Write entries when a decision is hard to reverse, affects multiple components, or future-you will ask "why did we do it this way?"

---

## ADR-001: Supabase (Postgres + RLS + Auth) on Vercel, single Next.js deployable

**Date:** 2026-07-26
**Status:** Accepted

**Context**
One-person build, 90-day pilot horizon, multi-tenant from day one, PII involved.

**Decision**
We will run one Next.js app on Vercel with Supabase as the entire backend: RLS for per-agency isolation, Supabase Auth (magic links), managed Postgres.

**Consequences**
- **Positive:** zero infra time; tenancy nearly free via RLS; never hand-roll auth.
- **Negative:** Supabase lock-in; RLS bugs are silent data leaks — must be tested, not assumed.

**Alternatives considered**
- Neon + Clerk — more assembly for marginal gain.

---

## ADR-002: Product invariants enforced in the database, not app code

**Date:** 2026-07-26
**Status:** Accepted

**Context**
The spec's non-negotiables: no orphan contacts, attribution immutable, opt-out irreversible, stage history queryable.

**Decision**
We will enforce them in Postgres: `contact.source_id` NOT NULL + immutability trigger; `stage_change`/`touch` append-only triggers; stage moves only via `set_contact_stage()` RPC; opt-out irreversibility trigger; anonymous capture only through the `public_capture()` security-definer RPC (no anon table grants).

**Consequences**
- **Positive:** invariants survive every future code path, including bugs.
- **Negative:** schema changes need migrations even for behavior tweaks; the `porchlight.stage_change_ok` GUC dance is non-obvious.

---

## ADR-003: Email-first messaging; SMS deferred behind A2P 10DLC

**Date:** 2026-07-26
**Status:** Accepted

**Context**
Twilio A2P registration takes 4–8 weeks and needs a business entity; nurture can't block on it.

**Decision**
We will ship nurture on Resend email only, with a channel-agnostic send layer (`src/lib/send.ts`) so SMS drops in later.

**Consequences**
- **Positive:** no external blocker to the pilot.
- **Negative:** text-in keyword capture (spec module 1) waits for v1.1.

---

## ADR-004: One send path with consent, idempotency, and pause checked at the send layer

**Date:** 2026-07-26
**Status:** Accepted

**Context**
The product-ending failure mode is spamming a stranger (e.g., 40 texts at 3am). Policy-level consent is not enough.

**Decision**
Every automated message goes through `sendNurtureEmail()`: consent/opt-out/pause checked there; a unique `(contact_id, dedupe_key)` row in `send_log` is claimed *before* sending (double-fired cron sends once); human replies set `automation_paused_at`.

**Consequences**
- **Positive:** structurally impossible to double-send or message the unconsented.
- **Negative:** all future channels must route through this layer — no shortcuts.

---

## ADR-005: First-touch attribution, human-confirmed outcomes

**Date:** 2026-07-26
**Status:** Accepted

**Context**
Multi-touch attribution models are a marketer's argument, not a recruiter's need; Porchlight can't see licensing systems.

**Decision**
First touch is the source of record (later touches visible in the timeline). Licensing is confirmed by a human click (stage → licensed writes `outcome`), plus a backfill flow for pre-existing homes. No Binti API until a design partner asks.

**Consequences**
- **Positive:** ledger is simple to explain and defend; works with zero integrations.
- **Negative:** outcome data is only as good as the monthly confirmation habit.

---

## ADR-007: Append-only history, with one audited door out

**Date:** 2026-07-26
**Status:** Accepted (supplements ADR-002)

**Context**
ADR-002's append-only triggers made contacts undeletable in practice: deleting a contact cascades into `touch` and `stage_change`, whose triggers reject every DELETE. A product holding prospective foster parents' PII cannot answer "please delete my information," and a mistyped contact was permanent. Discovered on the first live run, not by reading the code.

**Decision**
Keep append-only as the default, but allow DELETE when a one-shot GUC (`porchlight.erasing_contact`) is set — settable only inside `delete_contact()`, a security-definer RPC that verifies agency ownership and erases the whole person. Same pattern as `set_contact_stage()`. The `source` and its cost survive, so the ledger's denominators stay honest.

**Consequences**
- **Positive:** erasure requests are answerable; history still cannot be selectively rewritten (there is no path to editing one row).
- **Negative:** an erased contact silently reduces historical capture counts for their source; the ledger shows what remains, not what ever was.

**Alternatives considered**
- Soft-delete / anonymize in place — keeps counts intact, but "we still hold your row" is a weak answer to an erasure request.
- Dropping the DELETE triggers entirely — would allow quiet history deletion, which the attribution claim depends on.

---

## ADR-006: Milestone-based plan; dashboards behind auth, storybook landing at `/`

**Date:** 2026-07-26
**Status:** Accepted

**Context**
Perry prefers milestones over day counts. The landing page must feel family-warm ("foster care, not corporate SaaS") and stand out.

**Decision**
Track work as milestones M0–M4. `/` renders the illustrated storybook landing (Fraunces/Karla/Caveat, house scene, quilt patches) for signed-out visitors and the dashboard when signed in; the app degrades gracefully when Supabase env vars are absent.

**Consequences**
- **Positive:** one URL for marketing + product; deploys never 500 on a fresh project.
- **Negative:** landing and app share a bundle; keep the landing dependency-free.

---
