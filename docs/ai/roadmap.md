# Roadmap

Forward-looking direction. Pair with tasks.md (active work) and memory.md (history).

## Vision

Porchlight is the pre-inquiry recruitment layer for foster care agencies: capture people years before they'd ever fill out a form, hold "not yet" warmly for as long as it takes, and trace every licensed home back to its first touch. Incumbents (Binti/Casebook/CCWIS) all start at the application; everything upstream is unowned ground. Buyer: AZ private licensing agencies (short sales cycles, concrete ROI: one extra licensed home pays for the software).

## Current Focus

**Theme:** Land the first paying design partner. The product is client-ready and
deployed on its own domain; what it has never done is send a real email or carry
a real agency's families.
**Goals:**
1. Land one Arizona design-partner agency for a single-event pilot
2. First genuine nurture email sent end to end (needs Resend; the domain is now
   in hand)

## Now

- **A throwaway Supabase project.** It reads like a CI chore and is actually the
  highest-leverage item on this list: it is why the suites only run when somebody
  remembers, why every verification writes to the database production uses, and
  why migrations have to be hand-pasted. One afternoon retires all three.
- **CI on pull request** — typecheck, lint, build, `npm audit`. None of it needs
  a database, so it lands before the project above; the suites join afterwards.
  Then protect `main`.
- **Rate limit the capture page** before a printed QR code is on a real table.
  It is the only public write path and currently has no throttle of any kind.
- **Resend account + verified domain.** The send layer has been exercised only
  against a missing API key, where it correctly skips. Nothing has reached an
  inbox. Cannot be rehearsed on the demo agency, which `send.ts` refuses. Check
  Gmail's one-click unsubscribe against a real message while you're there.
- **Prove the live site with a human** — magic-link delivery, a printed QR
  scanned on mobile data, and the mobile nav on an actual phone.
- **Design-partner onboarding** — seed sources, backfill licensed homes, set
  their counties on `/arizona`.

## Next

- Email the invitation from `/settings/team` instead of copying a link. Note it
  will be the first non-nurture message through `send.ts` and will meet the
  channel-seam problem in ADR-003 before SMS does.
- A "who's in onboarding" list — the tracker is only reachable per contact
- Error reporting and a cron heartbeat; a dead tick is currently invisible
- Refresh the Arizona figures when DCS publishes (twice a year; see tasks.md)

## Later (v1.1 → v2, per spec)

- Twilio SMS + A2P 10DLC (file when a business entity exists; 4–8 wk lead) + text-in keyword capture
- Spanish-language capture and nurture (non-negotiable for Maricopa/Pima at scale)
- Binti/CCWIS API handoff (trigger: design partner asks; CSV until then)
- Retention pulse, multi-agency rollup (v2)

## Recently Completed

- Engineering audit (`docs/audit/`, 21 findings) and its Horizon 1: tenancy guard, unsubscribe rework, fail-closed system secrets, the 1000-row cap. No open Critical or High findings. Tagged `v0.6.0` — 2026-07-26
- Add a contact from anywhere, delete a source, and a full responsive pass — the three gaps found by using the product rather than reading it — 2026-07-26
- Production on porchlightfostercare.org: DNS, Vercel env, rotated system secrets, Supabase auth redirects, apex serving so QR codes carry no redirect — 2026-07-26
- M5 complete (A–H): app shell, contact timeline, design system, demo agency, Arizona dashboard, onboarding progress, teammates, suites — 2026-07-26
- M4-A/B: live Supabase, five verification suites, four defects and one security hole found and fixed — 2026-07-26
- MVP milestones 0–3 + landing page — 2026-07-26

## Deferred / Cancelled

- Home-study/licensing workflow, case management, child data, caregiver app, group-home compliance — deliberately out of scope (spec §02)
