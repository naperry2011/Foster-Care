# Tasks

Active work. Update as items are completed and new work is identified.

## Current milestone

**Milestone 5 — Client-ready.** Branch `m5-client-ready`.
Make the platform presentable to real Arizona agencies: the Arizona data
dashboard, a family onboarding tracker, a seeded demo agency, and the polish
that makes the existing work *look* as finished as it is.

**Done:** A (app shell + bug sweep) · B (contact detail + timeline) ·
C (design system) · D (demo agency)
**Remaining:** E (Arizona data) · F (family onboarding) · G (teammates) ·
H (docs + suites)

---

## Next session — Slice E: Arizona data dashboard

### ⚠️ Do this first (human, ~10 minutes)

`dcs.az.gov` returns **403 to every server-side fetcher** — curl, node, the
agent's tools. The workbooks must be downloaded in a real browser.

1. Download **Semi-Annual Child Welfare Report, Mar 2026** (XLSX, ~1.1 MB)
   https://dcs.az.gov/content/semi-annual-child-welfare-report-mar-2026
2. Download **Monthly Operational & Outcomes Report, Jun 2026** (XLSX, ~1 MB)
   https://dcs.az.gov/content/monthly-operational-outcomes-report-june-2026
3. Drop both somewhere in the repo (gitignored) and say where.

Then: inventory both workbooks into `docs/az-data-sources.md` — tab names,
header row index, which tab holds each A.R.S. §8-526 item, county-name
spellings, whether regions are named or coded. **Do not write the parser
before that file exists.**

### What the public data actually supports (verified — respect exactly)

| Grain | Metrics |
|---|---|
| **By county** | entries into out-of-home care; % of children placed (§8-526 items 12, 14, 15) |
| **By DCS region** | minimum licensed foster homes *required* — the state's own target (item 18) |
| **Statewide only** | children in care point-in-time (20); congregate care # and % (22); total licensed homes + kinship split (17) |
| **Not published** | children currently in care *per county*; licensed homes *per county* |

The page must **say so in plain English** where a grain isn't published,
rather than showing a blank. No API, no CSV, no open-data portal — ingest is a
human-run script twice a year, not a cron scrape.

### Build

- **Migration 0007**: `az_geo` (state/region/county, FK'd from everything so a
  typo can't orphan a number), `az_metric` (with `published_levels` — what lets
  the UI *say* what Arizona doesn't publish), `az_stat_source` (with
  `source_kind`, because "1,046 homes" is the Governor's office via KJZZ, not a
  DCS dataset), `az_stat` (**no write policy at all** — service-role only),
  `agency_target` (agency-scoped RLS), `agency_county`.
  Remember: `revoke ... from anon` by name on every new function.
- **Seed the six verified headlines in the migration**, so the page ships and
  demos before any parsing exists:
  - 1,046 additional foster homes needed over 12 months — Gov. Hobbs' office
    via KJZZ, 2025-12-05
  - licensed homes down 62%, 2017→2025 — same
  - children in group homes 1,995 (2021) → 1,732 (2024) → 1,457 (2026,
    **flag as projection**)
  - DCS FY26 goal: −2% congregate care days
  - foster reimbursement +50% for ages 6–18, effective 2025-12-01
  - "over 7,000 children need foster or adoptive care" — DCS, **undated page,
    must be labelled as such**
- **`/arizona`** in three bands: statewide headlines (using the existing
  `Cited` component), your counties, your goals. Agency-entered targets render
  in the warm/handwritten treatment so they can never be mistaken for state
  data.
- **`scripts/az-stats-import.mjs`** with a dry-run diff against `az_stat`,
  `--apply` to upsert. `xlsx` as a devDependency only.

**Done means:** every number carries a visible publisher, link and as-of date;
projections are labelled; unpublished grains are stated, not hidden.

---

## Then — Slices F, G, H

**F — Family onboarding progress** (migration 0008). Biggest remaining piece
and a deliberate departure from spec §02.
- `journey_requirement` (global AZ catalog + per-agency overrides, same pattern
  as `nurture_template`), `journey`, `journey_step`.
- ⚠️ **`ON DELETE CASCADE` on both journey FKs** or `delete_contact()` aborts →
  `purgeAgency` fails → every suite goes red.
- Seed the real AZ requirements (Level 1 Fingerprint Clearance Card, FBI/local
  background check, 3 computer-based trainings, 10 instructor-led webinars over
  5 weeks, all training within 8 weeks, home study, medical qualification,
  life-safety inspection, 21+). **No hour counts in any copy** — DCS's FAQ says
  15 in-class hours, its training page implies 30; cite structure only and put
  that reasoning in a SQL comment.
- A family in onboarding sits at `inquiry` with a parallel `journey` row. **No
  new `contact_stage` value** — it would reinterpret existing history and break
  `BOARD_STAGES`/`WARM_STAGES`/cron filters.
- Call it **"Onboarding progress"**, never "Licensing". No document upload, no
  e-signature, no case data. Completing every step *prompts* "Mark licensed?",
  never performs it.

**G — Teammates + getting-started checklist** (migration 0009). `agency_invite`
+ `accept_invite` RPC (replacing the service-role write in onboarding),
`/settings/team`, dashboard checklist that ticks itself and disappears.
**CSV contact import stays out of scope** — importing a list with no consent
provenance is the one change that could turn Porchlight into the thing it
exists to prevent (ADR-004).

**H — Docs + suites.** Extend `anon-audit` with every new table and RPC;
`smoke-test` with journey cascade and `az_stat` read-only-ness; write ADR-008
(journey as parallel record), ADR-009 (public vs agency statistics), ADR-010
(demo tenancy). Then merge `m5-client-ready` to `main`.

---

## Blocked

- [ ] Twilio A2P 10DLC registration — needs a legal business entity/EIN
- [ ] Real email send never verified — needs a Resend account + verified domain

## Bugs

- (none open)

## Tech Debt

- [ ] `/ledger` aggregates in TypeScript over every contact; move to a SQL view past ~1,000
- [ ] A send that crashes mid-flight leaves a `sending` row that never retries (deliberate: prefers a missed email to a double-send)
- [ ] Onboarding still creates one agency per user via the service role — Slice G replaces this
- [ ] Board has no drag-and-drop; per-card `<select>` is the mechanism
- [ ] Suites aren't in CI — needs a throwaway Supabase project
