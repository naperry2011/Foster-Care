# Arizona source data — workbook inventory

What Arizona actually publishes, where it lives inside the two DCS workbooks,
and the traps in parsing them. Written before `scripts/az-stats-import.mjs`
existed, on purpose: the parser is shaped by this file, not the other way round.

## Getting the files

`dcs.az.gov` returns **403 to every server-side fetcher** — curl, node, agent
tooling. Both workbooks must be downloaded in a real browser by a human, then
dropped in `az_docs/` (gitignored). There is no API, no CSV endpoint, and no
open-data portal. Ingest is a human-run script twice a year, not a cron scrape.

| Local file | Source page |
|---|---|
| `az_docs/Semi Annual Child Welfare Report_March 2026_FINAL_1.xlsx` | https://dcs.az.gov/content/semi-annual-child-welfare-report-mar-2026 |
| `az_docs/FY26 Monthly Operational Outcomes Report_June_electronic.xlsx` | https://dcs.az.gov/content/monthly-operational-outcomes-report-june-2026 |

## Workbook A — Semi-Annual Child Welfare Report, March 2026

Statutory report under **A.R.S. § 8-526**; the parenthesised numbers in tab
titles are the statute's item numbers. 32 tabs. Reporting period covered by
the most recent column: **July 1 2025 – December 31 2025**.

### Tabs we read

| Tab | A1 title | Item | Grain |
|---|---|---|---|
| `Entries` | CHILDREN ENTERING OUT-OF-HOME CARE (12, 14 & 15) | 12/14/15 | **county** + statewide |
| `OOH` | Number and Percentage of Children in Out-of-Home Care | 20, 17 | statewide only |
| `Congregate Care` | Number and Percentage of Children in Congregate Care | 22 | statewide only |
| `Placement` | TYPE OF OUT-OF-HOME PLACEMENT, CATEGORIZED BY AGE (20D) | 20D | statewide, by age |
| `Case Mgt.` | PARENT / CHILD VISITATION | 18 | statewide only |

Ignored: investigations, fatalities, TPR, adoption, caseloads, staffing,
expenditures, runaways — none of it is recruitment data and some of it is
child-level. Porchlight does not touch child data (spec §02).

### `Entries` — the only county-grain tab

Column headers repeat on every period block, at column B onward:

```
 APACHE  COCHISE  COCONINO  GILA  GRAHAM  GREENLEE  LA PAZ  MARICOPA
 MOHAVE  NAVAJO  PIMA  PINAL  SANTA CRUZ  YAVAPAI  YUMA  STATEWIDE
```

All 15 Arizona counties, **uppercase, with a leading space**, `LA PAZ` and
`SANTA CRUZ` as two words. `STATEWIDE` is the 16th column, not a county.

Each period is a ~20-row block introduced by a bare date-range cell in column
A (`07/01/2025 through 12/31/2025`). 17 periods, back to `10/1/2017 through
3/31/2018` — note the older labels drop the zero padding. Rows we want, found
**by label within the block**:

- `Children reported during period`
- `Children removed during period*` — this is the entries-into-care number
- `Voluntary Placements`, `Children with prior removal in previous 12…`

Verified for Jul–Dec 2025: Maricopa 1,459 removed, Pima 480, Pinal 136,
Mohave 106, Coconino 51, Cochise 48, Navajo 48, Yuma 55, Yavapai 56, Gila 24,
Santa Cruz 22, Apache 17, Graham 7, La Paz 5, Greenlee 0 — statewide 2,514.

### `OOH` — statewide totals and the licensed-homes count

Columns are `as of` dates going backwards: `as of 12/31/2025`, `as of
06/30/2025`, `as of 12/31/2024`, … Each date spans two columns
(`# of Children`, `% of Total`).

As of **12/31/2025**:

| Row label | Value |
|---|---|
| `TOTAL OOH` | 8,183 |
| `Unlicensed Kinship Homes` (17) | 2,193 |
| `Total Licensed Kinship Foster Homes` (17) | 222 |
| `Licensed Community Foster Homes` (17) | 1,497 (3,767 bed spaces) |
| `Total Licensed Foster Homes` (17) | **1,719** |

### `Congregate Care`

As of 12/31/2025: **808** children. Type split — Licensed Group Home 347,
Group Home Specialized 171, QRTP 282. Excludes DDD group homes, Welcome
Center, and facilities DCS does not license, per A.R.S. § 8-526(22)(d).

## Workbook B — FY26 Monthly Operational & Outcomes Report, June

10 tabs. Columns are **state fiscal years** (`SFY 15` … `SFY25`, `SFY26 YTD`)
followed by ~130 individual month columns (`Jul 2016` onward). The SFY columns
are what we ingest; the month columns are noisy and often `---`.

### `Operational Data` → `Licensed Foster Care Capacity` block

| Row | SFY17 | SFY22 | SFY23 | SFY24 | SFY25 | SFY26 YTD |
|---|---|---|---|---|---|---|
| `# of Licensed Foster Homes` | 4,875 | 2,864 | 2,537 | 2,049 | 1,859 | **1,628** |
| `# of Licensed Foster Care Beds` | 11,046 | 6,360 | 5,569 | 4,580 | 4,079 | 3,585 |
| `# of New Licenses Issued` | 1,979 | 841 | 73 | 56 | 43 | 29 |

**4,875 → 1,859 across SFY17–SFY25 is −61.9%**, which independently confirms
the "62% decline" figure the Governor's office gave KJZZ. That is the single
most useful cross-check in either workbook.

⚠️ `# of New Licenses Issued` falls 841 → 73 between SFY22 and SFY23. A 91%
single-year collapse alongside a smooth decline in total homes is far more
likely a counting-method change than a real event. **Do not headline this
row.** It is ingested but not displayed.

### ` Outcome Data` → INDICATOR 8 (note the leading space in the tab name)

`% of days spent in Congregate Care`: SFY23 13.4% → SFY24 15.2% → SFY25 15.8%
→ **SFY26 YTD 17.2%**. Congregate-care days are *rising*, against a published
DCS goal of a 2-point reduction by June 2026.

## What Arizona does not publish

| Wanted | Reality |
|---|---|
| Children in care **per county** | Not published. `OOH` is statewide only; only *entries* are countywide. |
| Licensed foster homes **per county** | Not published at any sub-state grain. |
| Anything **per DCS region** | Neither workbook contains a region breakdown. |
| A state target for homes needed | Not in either workbook. The only such figure is the Governor's office's 1,046, via KJZZ. |

The `/arizona` page must **say so in plain English** where a grain isn't
published, rather than rendering a blank. That is what `az_metric.published_levels`
and `az_metric.unpublished_note` exist for.

### Two corrections to the pre-inventory plan

1. **Item 18 is not "minimum licensed foster homes required by region."** In
   this workbook item 18 is `LICENSED FOSTER HOMES RECEIVING VISITATION BY
   LICENSING AGENCY REPRESENTATIVE` (tab `Case Mgt.`), statewide only. No
   region-level target exists anywhere in the published data, so the planned
   "minimum homes required by DCS region" band cannot be built from a source.
2. **The group-home series 1,995 (2021) → 1,732 (2024) → 1,457 (2026) does not
   reconcile with either workbook** and its origin could not be traced. The
   primary sources say 808 children in congregate care as of 12/31/2025. The
   unsourced series is dropped; the congregate-care story is told with
   INDICATOR 8 (% of care days), which is published, current, and rising.

## Parsing traps

- **SheetJS's ESM build has no `fs` bound.** `XLSX.readFile()` throws "Cannot
  access file". Read the bytes yourself and use `XLSX.read(buffer)`.
- **Never address rows by index from `sheet_to_json({blankrows:false})`.** It
  compacts blank rows, so its indices drift from the real sheet — the licensed
  homes header is `A78` in the sheet but row 70 in the compacted array. Locate
  blocks by matching label text, then walk forward.
- Period-block heights are not constant: 20 rows in recent years, 21–22 in
  2018–2019. Match the date-range header by regex, don't stride.
- Numbers arrive as JS numbers; percentages are **fractions** (0.1719), not
  1719. Store the fraction and format at render.
- Suppressed and not-yet-collected cells are the strings `---`, `n/a`, or a
  space. All must read as null, never zero.
- County names need trimming and title-casing; `LA PAZ` → `La Paz`.
