// Load Arizona's published child-welfare numbers into az_stat.
//
//   node scripts/az-stats-import.mjs            # dry run: diff against the DB
//   node scripts/az-stats-import.mjs --apply    # write the differences
//
// Run this twice a year, by hand, after downloading the two workbooks into
// az_docs/ (dcs.az.gov 403s every server-side fetcher, so a human with a real
// browser is part of the pipeline — see docs/az-data-sources.md).
//
// az_stat has no insert policy, so this only works with the service-role key.
// That is the point: the state's numbers cannot be edited from a browser.
import * as XLSX from "xlsx";
import fs from "node:fs";
import path from "node:path";
import { loadEnv, makeClients } from "./lib.mjs";

const APPLY = process.argv.includes("--apply");
const envPath = process.argv.find((a) => a.endsWith(".env.local")) ?? ".env.local";
const DIR = "az_docs";

const SEMIANNUAL = "Semi Annual Child Welfare Report_March 2026_FINAL_1.xlsx";
const MONTHLY = "FY26 Monthly Operational Outcomes Report_June_electronic.xlsx";
const SRC_SEMIANNUAL = "dcs-semiannual-2026-03";
const SRC_MONTHLY = "dcs-monthly-2026-06";

// ---------- workbook helpers ----------

// SheetJS's ESM build has no fs bound — XLSX.readFile() throws. Read the bytes.
function sheetRows(file, sheetName) {
  const wb = XLSX.read(fs.readFileSync(file));
  const ws = wb.Sheets[sheetName];
  if (!ws) throw new Error(`${path.basename(file)}: no sheet "${sheetName}"`);
  // blankrows:true keeps array indices aligned with real sheet rows. Dropping
  // them silently shifts every index and the labels stop matching their data.
  return XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: true, defval: null });
}

const text = (c) => (c == null ? "" : String(c).replace(/\s+/g, " ").trim());

// Suppressed and not-yet-collected cells are "---", "n/a" or a lone space.
// Every one of them must read as null; a zero here would be a lie.
function num(c) {
  if (c == null) return null;
  if (typeof c === "number") return Number.isFinite(c) ? c : null;
  const s = String(c).replace(/[,\s]/g, "");
  if (!s || /^-+$/.test(s) || /^n\/?a$/i.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const findRow = (rows, pred, from = 0) => {
  for (let i = from; i < rows.length; i++) if (pred(rows[i] ?? [], i)) return i;
  return -1;
};

const startsWith = (prefix) => (r) =>
  text(r[0]).toLowerCase().startsWith(prefix.toLowerCase());

// Section headings repeat their own data row's wording — "UNLICENSED KINSHIP
// HOMES (17)" sits directly above "Unlicensed Kinship Homes" — so a prefix
// match lands on the heading, which has no numbers in it. Match the whole cell.
const exact = (label) => (r) => text(r[0]).toLowerCase() === label.toLowerCase();

// Walk backwards for the nearest "as of MM/DD/YYYY" header and map date -> column.
// Each block in the OOH tab carries its own copy, so the top row is not enough.
function asOfColumns(rows, fromRow) {
  for (let i = fromRow; i >= 0; i--) {
    const r = rows[i] ?? [];
    const map = new Map();
    r.forEach((c, j) => {
      const m = text(c).match(/^(?:TEMPLATE\s+)?as of (\d{1,2})\/(\d{1,2})\/(\d{4})$/i);
      if (m) map.set(`${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`, j);
    });
    if (map.size) return map;
  }
  return new Map();
}

const latest = (map) => [...map.keys()].sort().at(-1);

// ---------- extraction ----------

const stats = [];
const add = (s) => {
  if (s.value == null) {
    console.log(`  ! skipped ${s.metric_id}/${s.geo_id}/${s.period_label} — no value in workbook`);
    return;
  }
  stats.push(s);
};

const COUNTY_IDS = {
  APACHE: "az-apache", COCHISE: "az-cochise", COCONINO: "az-coconino",
  GILA: "az-gila", GRAHAM: "az-graham", GREENLEE: "az-greenlee",
  "LA PAZ": "az-la-paz", MARICOPA: "az-maricopa", MOHAVE: "az-mohave",
  NAVAJO: "az-navajo", PIMA: "az-pima", PINAL: "az-pinal",
  "SANTA CRUZ": "az-santa-cruz", YAVAPAI: "az-yavapai", YUMA: "az-yuma",
  STATEWIDE: "az",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Entries — the one county-grain table Arizona publishes.
function readEntries(file) {
  const rows = sheetRows(file, "Entries");

  const headerIdx = findRow(rows, (r) => r.some((c) => text(c) === "APACHE"));
  if (headerIdx < 0) throw new Error("Entries: no county header row");
  const cols = new Map();
  (rows[headerIdx] ?? []).forEach((c, j) => {
    const id = COUNTY_IDS[text(c).toUpperCase()];
    if (id) cols.set(id, j);
  });
  if (cols.size !== 16) throw new Error(`Entries: expected 16 county columns, found ${cols.size}`);

  // Period blocks are introduced by a bare date range and are NOT a fixed
  // height (20 rows recently, 21-22 in 2018-19), so find them, don't stride.
  const periodRx = /^(\d{1,2})\/(\d{1,2})\/(\d{4}) through (\d{1,2})\/(\d{1,2})\/(\d{4})$/;
  const periods = [];
  rows.forEach((r, i) => {
    const m = text((r ?? [])[0]).match(periodRx);
    if (m) periods.push({ i, m });
  });
  if (!periods.length) throw new Error("Entries: no period blocks");

  // Newest first in the sheet; sort by end date to be sure.
  periods.sort((a, b) => (endOf(b.m) < endOf(a.m) ? -1 : 1));
  const { i: start, m } = periods[0];
  const end = periods.find((p) => p.i > start)?.i ?? rows.length;

  const rowIdx = findRow(rows, startsWith("Children removed during period"), start);
  if (rowIdx < 0 || rowIdx >= end) throw new Error("Entries: no removals row in latest block");

  const asOf = endOf(m);
  const label = `${MONTHS[Number(m[1]) - 1]}–${MONTHS[Number(m[4]) - 1]} ${m[6]}`;
  for (const [geo, col] of cols) {
    add({
      metric_id: "children_entering_care", geo_id: geo, source_id: SRC_SEMIANNUAL,
      as_of: asOf, period_label: label, value: num((rows[rowIdx] ?? [])[col]),
      is_projection: false, note: null,
    });
  }
  console.log(`  Entries: ${label} (as of ${asOf}), ${cols.size} places`);
}

const endOf = (m) => `${m[6]}-${m[4].padStart(2, "0")}-${m[5].padStart(2, "0")}`;

// OOH + Congregate Care — statewide point-in-time counts.
function readPointInTime(file) {
  const rows = sheetRows(file, "OOH");

  const pick = (label, metric, note = null) => {
    const i = findRow(rows, exact(label));
    if (i < 0) throw new Error(`OOH: no row "${label}"`);
    const cols = asOfColumns(rows, i);
    const date = latest(cols);
    if (!date) throw new Error(`OOH: no as-of header above "${label}"`);
    add({
      metric_id: metric, geo_id: "az", source_id: SRC_SEMIANNUAL, as_of: date,
      period_label: `as of ${fmt(date)}`, value: num((rows[i] ?? [])[cols.get(date)]),
      is_projection: false, note,
    });
  };

  pick("TOTAL OOH", "children_in_care");
  pick("Unlicensed Kinship Homes", "unlicensed_kinship_homes");
  pick("Total Licensed Kinship Foster Homes", "licensed_kinship_homes");
  pick("Licensed Community Foster Homes", "licensed_community_homes");
  pick("Total Licensed Foster Homes", "licensed_foster_homes");

  const cc = sheetRows(file, "Congregate Care");
  const i = findRow(cc, exact("TOTAL Gender"));
  if (i < 0) throw new Error("Congregate Care: no TOTAL Gender row");
  const cols = asOfColumns(cc, i);
  const date = latest(cols);
  add({
    metric_id: "children_in_congregate_care", geo_id: "az", source_id: SRC_SEMIANNUAL,
    as_of: date, period_label: `as of ${fmt(date)}`,
    value: num((cc[i] ?? [])[cols.get(date)]), is_projection: false, note: null,
  });
  console.log(`  OOH + Congregate Care: as of ${fmt(date)}`);
}

function fmt(iso) {
  const [y, m, d] = iso.split("-");
  return `${MONTHS[Number(m) - 1]} ${Number(d)}, ${y}`;
}

// Monthly report — state-fiscal-year series.
const SFY_WANTED = ["SFY17", "SFY25", "SFY26YTD"];
const sfyLabel = (k) => (k === "SFY26YTD" ? "SFY26 to date" : k);
const sfyAsOf = (k) => `20${k.slice(3, 5)}-06-30`;
const sfyNote = (k) =>
  k === "SFY26YTD" ? "Fiscal year to date, not a final-year figure." : null;

function sfyColumns(row) {
  const cols = new Map();
  (row ?? []).forEach((c, j) => {
    const key = text(c).replace(/\s+/g, "").toUpperCase();
    if (/^SFY\d{2}(YTD)?$/.test(key) && !cols.has(key)) cols.set(key, j);
  });
  return cols;
}

function readFiscalYears(file) {
  const ops = sheetRows(file, "Operational Data");
  const capIdx = findRow(ops, exact("Licensed Foster Care Capacity"));
  if (capIdx < 0) throw new Error("Operational Data: no capacity block");
  const capCols = sfyColumns(ops[capIdx]);

  const series = [
    ["# of Licensed Foster Homes", "licensed_foster_homes"],
    ["# of Licensed Foster Care Beds", "licensed_foster_beds"],
    ["# of New Licenses Issued", "new_licenses_issued"],
  ];
  for (const [label, metric] of series) {
    const i = findRow(ops, exact(label), capIdx);
    if (i < 0) throw new Error(`Operational Data: no row "${label}"`);
    for (const key of SFY_WANTED) {
      if (!capCols.has(key)) continue;
      add({
        metric_id: metric, geo_id: "az", source_id: SRC_MONTHLY, as_of: sfyAsOf(key),
        period_label: sfyLabel(key), value: num((ops[i] ?? [])[capCols.get(key)]),
        is_projection: false, note: sfyNote(key),
      });
    }
  }

  // Note the leading space in the tab name — it is in the file, not a typo.
  const out = sheetRows(file, " Outcome Data");
  const indIdx = findRow(out, startsWith("INDICATOR 8"));
  if (indIdx < 0) throw new Error("Outcome Data: no INDICATOR 8");
  const outCols = sfyColumns(out[indIdx]);
  const pctIdx = findRow(out, (r) => text(r[0]).startsWith("% of days spent in Congregate Care"), indIdx);
  if (pctIdx < 0) throw new Error("Outcome Data: no congregate-care-days row");
  // INDICATOR 8 only starts reporting in SFY18, so SFY17 is deliberately absent.
  for (const key of ["SFY24", "SFY25", "SFY26YTD"]) {
    if (!outCols.has(key)) continue;
    // Percentages arrive as fractions (0.1719). Store the fraction; format at render.
    add({
      metric_id: "pct_days_congregate_care", geo_id: "az", source_id: SRC_MONTHLY,
      as_of: sfyAsOf(key), period_label: sfyLabel(key),
      value: num((out[pctIdx] ?? [])[outCols.get(key)]), is_projection: false,
      note: sfyNote(key),
    });
  }
  console.log(`  Operational + Outcome Data: ${SFY_WANTED.join(", ")}`);
}

// ---------- diff and write ----------

const key = (s) => `${s.metric_id}|${s.geo_id}|${s.period_label}`;

const semiannual = path.join(DIR, SEMIANNUAL);
const monthly = path.join(DIR, MONTHLY);
for (const f of [semiannual, monthly]) {
  if (!fs.existsSync(f)) {
    console.error(`\nMissing ${f}\nDownload it in a real browser — see docs/az-data-sources.md.`);
    process.exit(1);
  }
}

console.log("\nReading workbooks");
readEntries(semiannual);
readPointInTime(semiannual);
readFiscalYears(monthly);

const env = loadEnv(envPath);
const { admin } = makeClients(env);

const { data: existing, error } = await admin
  .from("az_stat")
  .select("metric_id, geo_id, period_label, value, as_of, source_id");
if (error) {
  console.error(`\nCould not read az_stat: ${error.message}`);
  process.exit(1);
}
const have = new Map((existing ?? []).map((r) => [key(r), r]));

const added = [], changed = [], same = [];
for (const s of stats) {
  const prev = have.get(key(s));
  if (!prev) added.push(s);
  else if (Number(prev.value) !== Number(s.value) || prev.as_of !== s.as_of) {
    changed.push({ s, prev });
  } else same.push(s);
}

console.log(`\n${stats.length} figures parsed — ${added.length} new, ${changed.length} changed, ${same.length} unchanged`);
for (const s of added) console.log(`  + ${key(s)} = ${s.value}`);
for (const { s, prev } of changed) {
  console.log(`  ~ ${key(s)}: ${prev.value} -> ${s.value}${prev.as_of !== s.as_of ? ` (as of ${prev.as_of} -> ${s.as_of})` : ""}`);
}

if (!APPLY) {
  console.log(`\nDry run. Re-run with --apply to write ${added.length + changed.length} row(s).`);
  process.exit(0);
}
if (!added.length && !changed.length) {
  console.log("\nNothing to write.");
  process.exit(0);
}

const { error: upErr } = await admin
  .from("az_stat")
  .upsert(
    [...added, ...changed.map((c) => c.s)].map((s) => ({ ...s, imported_at: new Date().toISOString() })),
    { onConflict: "metric_id,geo_id,period_label" }
  );
if (upErr) {
  console.error(`\nUpsert failed: ${upErr.message}`);
  process.exit(1);
}
console.log(`\nWrote ${added.length + changed.length} row(s) to az_stat.`);
