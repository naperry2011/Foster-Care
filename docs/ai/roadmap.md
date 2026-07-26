# Roadmap

Forward-looking direction. Pair with tasks.md (active work) and memory.md (history).

## Vision

Porchlight is the pre-inquiry recruitment layer for foster care agencies: capture people years before they'd ever fill out a form, hold "not yet" warmly for as long as it takes, and trace every licensed home back to its first touch. Incumbents (Binti/Casebook/CCWIS) all start at the application; everything upstream is unowned ground. Buyer: AZ private licensing agencies (short sales cycles, concrete ROI: one extra licensed home pays for the software).

## Current Focus

**Theme:** From "builds clean" to "runs live"
**Goals:**
1. Wire real Supabase project + verify the full flow end-to-end
2. Land one Arizona design-partner agency for a single-event pilot

## Now

- Supabase project creation + migrations + real env vars — blocked on Perry
- End-to-end pilot rehearsal (event → QR → capture → board → licensed → ledger)

## Next

- Verification suite from docs/PLAN.md: RLS isolation tests, Playwright e2e, send-layer tests, 3G capture-page check
- Vercel production deploy with cron + Resend configured
- Design-partner onboarding: seed sources, backfill outcomes, import contacts

## Later (v1.1 → v2, per spec)

- Twilio SMS + A2P 10DLC (file when a business entity exists; 4–8 wk lead) + text-in keyword capture
- Spanish-language capture and nurture (non-negotiable for Maricopa/Pima at scale)
- Binti/CCWIS API handoff (trigger: design partner asks; CSV until then)
- Retention pulse, multi-agency rollup (v2)

## Recently Completed

- MVP milestones 0–3 + landing page — 2026-07-26

## Deferred / Cancelled

- Home-study/licensing workflow, case management, child data, caregiver app, group-home compliance — deliberately out of scope (spec §02)
