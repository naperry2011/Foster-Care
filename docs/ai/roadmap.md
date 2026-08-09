# Roadmap

Forward-looking direction. Pair with tasks.md (active work) and memory.md (history).

## Vision

Porchlight is the pre-inquiry recruitment layer for foster care agencies: capture people years before they'd ever fill out a form, hold "not yet" warmly for as long as it takes, and trace every licensed home back to its first touch. Incumbents (Binti/Casebook/CCWIS) all start at the application; everything upstream is unowned ground. Buyer: AZ private licensing agencies (short sales cycles, concrete ROI: one extra licensed home pays for the software).

## Current Focus

**Theme:** The design partner exists. Make October work.

**The Greenhouse** is a design-partner agency with their own internal outreach
pilot starting in **October 2026**. They are focused on Tucson, where Pima has
the highest share of children placed outside their own county, and their stated
need is about **120 beds**. Their scope decision: the full loop, nurture email
included.

Everything below is sequenced backwards from that date. The five paths this
product exists for have never once been exercised — a QR scanned from a real
phone, an email delivered, a reply received, a wake-up fired, a ledger with real
outcomes — and all five will run for the first time in front of real families.

**Goals:**
1. The full loop working end to end for one real agency, in October
2. Their Tucson target expressible and measurable — county on a contact, and a
   goal that fills in rather than a line of text

See `docs/az-priorities.md` for what we told them, and the milestone plan in
PLAN.md (M6–M12).

## Now — M6, pilot-safe

Roughly half done. Everything shipped sits on `m6-pilot-safe` (PR #1, CI green)
and **is not yet merged**. Detail and status table in tasks.md.

**Done:** Resend account and verified domain — the one item with no slack, now
off the critical path. Capture-page hardening and wider slugs (F-006, F-020).
Webhook tenancy reduced (F-007). CI on pull request (F-008). `.env.example`
tracked (F-009).

**Still open:**

- **Legal entity decision.** Now likely the real critical path: it gates the
  privacy policy, the Resend DPA, any contract with The Greenhouse, and Twilio.
- **Privacy policy, Resend DPA, retention period, subject-access path** (audit
  H3-7). They hold PII about identifiable adults in October, and M10's
  demographic work is gated behind this being done properly.
- **A throwaway Supabase project**, so verification stops writing to the database
  that is about to hold a real agency's families. Also retires hand-pasted
  migrations and suites that only run when somebody remembers.
- **Secrets — and the repository — out of Dropbox** (F-010). Scoped to secrets
  at rest; in practice Dropbox is also syncing `.git` and `.next`, which has
  already rewritten git state mid-session and corrupted Turbopack's cache.
- **Cron heartbeat and error reporting** (F-011). A dead tick looks identical to
  a quiet week, and in October their wake-ups ride on it. Needs a migration.
- **Domain warming.** The first real send landed in spam, which is normal for a
  days-old domain and does not fix itself. If The Greenhouse's first nurture
  emails go out cold in October, a share land in spam and the waiting-room
  mechanic fails quietly while the ledger reports success. Start small real
  volumes now; register at Gmail Postmaster Tools.
- **A reply path.** Nothing can receive replies today, `send.ts` sets no
  `reply_to`, and the inbound webhook is the only thing in the product that can
  pause automation — there is no manual override. Four nurture templates invite
  a reply.
- **Prove the live site with a human** — magic-link delivery, a printed QR
  scanned on mobile data, and the mobile nav on an actual phone.

## Next — M7, Pima-ready, then the pilot

- **Migration 0013** — county and postal code on a contact (contacts currently
  carry no location at all, so the ledger cannot answer "how many homes in
  Pima?"); a `contact_profile` table for capacity, sibling groups, age ranges and
  placement types; and the `caregiver_kind` discriminator, shipped early so kin
  families captured in October are tagged from day one.
- **Make `agency_target` measurable** — it has no `geo_id` and no `metric_id`
  today, so "120 beds in Pima" is decorative and no progress is ever computed.
- **Homes lead, beds alongside.** Beds are summed from recorded capacity, never
  homes × a statewide average, and the screen says how many are unrecorded.
- **Video chat with The Greenhouse before 0013 is finalised** — their touch
  channels and their placement-type vocabulary go straight into the migration.
  Also resolve the congregate discrepancy (808 vs 1,500) before either number
  goes near a board pack.
- **Design their pilot feedback collection before October, not during.**
- **Onboard them** — seed sources, backfill licensed homes, set Pima on
  `/arizona`, set the 120 target.

## After the pilot

- **M9 — the kinship conversion funnel.** The largest gap in their brief:
  roughly ten unlicensed kin homes for every licensed one, families who already
  have the child, 60–90 days to license, stipend roughly doubles. Not
  recruitment — conversion. Deferred deliberately so the pilot shapes it. Note
  `0007_arizona.sql:275` currently annotates unlicensed kin as "not a
  recruitment pipeline"; that annotation is wrong and should go.
- **M10 — demographics and language**, gated on the privacy work above. Also
  unblocks Spanish capture.
- **M11 — the economics ledger.** `outcome.first_placement_on` has been declared
  since 0001 and written by nothing, and it is exactly what triggers the $1,250
  FAS placement incentive; plus $1,000 for a congregate step-down. The ledger is
  cost-only today and can finally argue in dollars.
- **M12 — the pitch surface**, and refresh overview/workflow/training, which all
  describe a single stranger-recruitment funnel and go stale when M9 lands.
- Email the invitation from `/settings/team` instead of copying a link. Note it
  will be the first non-nurture message through `send.ts` and will meet the
  channel-seam problem in ADR-003 before SMS does.
- A "who's in onboarding" list — the tracker is only reachable per contact
- Refresh the Arizona figures when DCS publishes (twice a year; see tasks.md)

## Later (v1.1 → v2, per spec)

- Twilio SMS + A2P 10DLC (file when a business entity exists; 4–8 wk lead) + text-in keyword capture
- Spanish-language capture and nurture (non-negotiable for Maricopa/Pima at scale)
- Binti/CCWIS API handoff (trigger: design partner asks; CSV until then)
- Retention pulse, multi-agency rollup (v2)

## Recently Completed

- **Email works.** Sending-only Resend key, `contact.porchlightfostercare.org` verified, DMARC added, a real message delivered with SPF/DKIM/DMARC all PASS and a DKIM-signed one-click unsubscribe. Placement is still spam — reputation, not configuration — so domain warming is now a scheduling item before October — 2026-08-09
- **M6 security and operations, on `m6-pilot-safe` (PR #1):** capture-page hardening and wider slugs (F-006, F-020), webhook tenancy reduced (F-007), CI on pull request (F-008), `.env.example` tracked (F-009) — 2026-08-09
- Two forgotten live test tenants would have been emailed by the next production tick, one at a stranger's real address. Marked demo; zero real sends pending. The ADR-010 send guard held for the demo agency's 179 consenting contacts — 2026-08-09
- **Design partner landed: The Greenhouse**, Tucson-focused, pilot in October 2026. Landscape brief received and answered in `docs/az-priorities.md`; M6–M12 planned against it — 2026-08-09
- Human-facing documentation (`docs/overview.md`, `workflow.md`, `training.md`) and a landing page that says what the product actually does, with the Arizona figures finally cited on it — 2026-08-09
- Fixed manually logged conversations recording as inbound regardless of who reached out — found while answering the design partner's question about touch-point tracking — 2026-08-09
- Engineering audit (`docs/audit/`, 21 findings) and its Horizon 1: tenancy guard, unsubscribe rework, fail-closed system secrets, the 1000-row cap. No open Critical or High findings. Tagged `v0.6.0` — 2026-07-26
- Add a contact from anywhere, delete a source, and a full responsive pass — the three gaps found by using the product rather than reading it — 2026-07-26
- Production on porchlightfostercare.org: DNS, Vercel env, rotated system secrets, Supabase auth redirects, apex serving so QR codes carry no redirect — 2026-07-26
- M5 complete (A–H): app shell, contact timeline, design system, demo agency, Arizona dashboard, onboarding progress, teammates, suites — 2026-07-26
- M4-A/B: live Supabase, five verification suites, four defects and one security hole found and fixed — 2026-07-26
- MVP milestones 0–3 + landing page — 2026-07-26

## Deferred / Cancelled

- Home-study/licensing workflow, case management, child data, caregiver app, group-home compliance — deliberately out of scope (spec §02)
