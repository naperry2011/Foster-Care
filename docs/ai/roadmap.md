# Roadmap

Forward-looking direction. Pair with tasks.md (active work) and memory.md (history).

## Vision

Porchlight is the pre-inquiry recruitment layer for foster care agencies: capture people years before they'd ever fill out a form, hold "not yet" warmly for as long as it takes, and trace every licensed home back to its first touch. Incumbents (Binti/Casebook/CCWIS) all start at the application; everything upstream is unowned ground. Buyer: AZ private licensing agencies (short sales cycles, concrete ROI: one extra licensed home pays for the software).

## Current Focus

**Theme:** Milestone 5 — client-ready. Make it presentable enough that an
Arizona recruitment director sees a product, not a prototype.
**Goals:**
1. Finish M5 (slices E–H) and merge to `main`
2. Land one Arizona design-partner agency for a single-event pilot

## Now

- **Slice E — Arizona data dashboard.** Blocked on a human download: `dcs.az.gov`
  403s server-side fetchers, so the two DCS workbooks must be fetched in a real
  browser before county data can be modelled. Headline figures can ship first.
- Slice F — family onboarding progress tracker
- Slice G — teammates + getting-started checklist
- Slice H — extend suites, write ADR-008/009, merge the branch

## Next

- Resend account + verified domain → first real nurture email ever sent
- Playwright e2e and the throttled-3G capture-page check
- Suites into CI (needs a throwaway Supabase project)
- Design-partner onboarding: seed sources, backfill outcomes

## Later (v1.1 → v2, per spec)

- Twilio SMS + A2P 10DLC (file when a business entity exists; 4–8 wk lead) + text-in keyword capture
- Spanish-language capture and nurture (non-negotiable for Maricopa/Pima at scale)
- Binti/CCWIS API handoff (trigger: design partner asks; CSV until then)
- Retention pulse, multi-agency rollup (v2)

## Recently Completed

- M5 slices A–D: app shell + sign-out, contact timeline, design system, demo agency — 2026-07-26
- M4-A/B: live Supabase, five verification suites, four defects and one security hole found and fixed — 2026-07-26
- MVP milestones 0–3 + landing page — 2026-07-26

## Deferred / Cancelled

- Home-study/licensing workflow, case management, child data, caregiver app, group-home compliance — deliberately out of scope (spec §02)
