// Does the SQL ledger (migration 0012) agree with the TypeScript it replaced?
//
// The ledger is the screen the sale rests on, so moving its arithmetic from the
// app into Postgres is only safe if the numbers do not move. This recomputes
// every figure the old way, from raw rows, and diffs it against ledger_rows().
//
//   node scripts/ledger-parity.mjs .env.local
//
// Reads only. Run it against any agency that has real history behind it; the
// demo tenant is the useful one, since an empty agency proves nothing.
import { loadEnv, makeClients } from "./lib.mjs";

const env = loadEnv(process.argv[2] ?? ".env.local");
const { admin } = makeClients(env);

// The old code read these unbounded and silently stopped at 1000, which is the
// bug this migration exists to fix. Page properly so the baseline is honest.
async function all(table, select, tweak = (q) => q) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await tweak(
      admin.from(table).select(select).order("id")
    ).range(from, from + 999);
    if (error) throw error;
    out.push(...(data ?? []));
    if ((data ?? []).length < 1000) return out;
  }
}

const WARM = ["curious", "considering", "not_yet"];
const median = (nums) => {
  if (!nums.length) return null;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

const { data: agencies } = await admin.from("agency").select("id, name, is_demo");
let failures = 0;
let compared = 0;
let skipped = 0;

for (const ag of agencies) {
  const agSources = (
    await all("source", "id, name, kind, cost_cents, hours_invested, agency_id")
  ).filter((s) => s.agency_id === ag.id);
  const contacts = (
    await all("contact", "id, source_id, stage, captured_at, opted_out_at, agency_id")
  ).filter((c) => c.agency_id === ag.id);
  const outcomes = await all("outcome", "contact_id, licensed_on, agency_id");
  const byContact = new Map(
    outcomes.filter((o) => o.agency_id === ag.id).map((o) => [o.contact_id, o.licensed_on])
  );

  const expected = agSources
    .map((s) => {
      const mine = contacts.filter((c) => c.source_id === s.id);
      const lic = mine.filter((c) => byContact.has(c.id));
      return {
        id: s.id,
        name: s.name,
        captured: mine.length,
        warm: mine.filter((c) => WARM.includes(c.stage) && !c.opted_out_at).length,
        inquiries: mine.filter((c) => ["inquiry", "licensed"].includes(c.stage)).length,
        licensed: lic.length,
        lag: median(
          lic.map(
            (c) =>
              (new Date(byContact.get(c.id)).getTime() -
                new Date(c.captured_at).getTime()) /
              (1000 * 60 * 60 * 24 * 30.4)
          )
        ),
      };
    })
    .sort((a, b) => b.licensed - a.licensed || b.warm - a.warm);

  if (!expected.length) continue;
  console.log(`\n== ${ag.name}${ag.is_demo ? " (demo)" : ""} — ${expected.length} sources`);

  // Only a member of the agency can call the RPC: it is security invoker, so
  // RLS scopes it, and the service role has no agency.
  const { makeUserIn } = await import("./lib.mjs");
  const u = await makeUserIn(env, admin, ag.id, "parity");
  const { data: actual, error } = await u.client.rpc("ledger_rows");
  await admin.auth.admin.deleteUser(u.userId);

  if (error) {
    console.log(`  SKIP — ${error.message}`);
    console.log("  (apply migration 0012, then re-run)");
    skipped++;
    continue;
  }
  compared++;

  const byId = new Map((actual ?? []).map((r) => [r.source_id, r]));
  for (const e of expected) {
    const a = byId.get(e.id);
    if (!a) {
      console.log(`  FAIL ${e.name}: missing from ledger_rows()`);
      failures++;
      continue;
    }
    const diffs = [];
    for (const k of ["captured", "warm", "inquiries", "licensed"]) {
      if (Number(a[k]) !== e[k]) diffs.push(`${k} ${e[k]} -> ${a[k]}`);
    }
    // Median lag is a float; a hundredth of a month is 43 minutes and the UI
    // rounds to whole months, so anything under 0.01 is agreement.
    const aLag = a.lag_months == null ? null : Number(a.lag_months);
    if ((e.lag == null) !== (aLag == null)) {
      diffs.push(`lag ${e.lag} -> ${aLag}`);
    } else if (e.lag != null && Math.abs(e.lag - aLag) > 0.01) {
      diffs.push(`lag ${e.lag.toFixed(3)} -> ${aLag.toFixed(3)}`);
    }
    if (diffs.length) {
      console.log(`  FAIL ${e.name}: ${diffs.join(", ")}`);
      failures++;
    } else {
      console.log(
        `  OK   ${e.name} — ${e.captured} captured, ${e.licensed} licensed, lag ${
          e.lag == null ? "—" : e.lag.toFixed(1)
        }`
      );
    }
  }

  const order = (actual ?? []).map((r) => r.source_id);
  const sameOrder = expected.every((e, i) => e.id === order[i]);
  sameOrder
    ? console.log("  OK   row order matches")
    : (console.log("  FAIL row order differs"), failures++);
}

// "Nothing was compared" must not read as "everything agreed". That is the
// same shape of false pass this whole migration exists to remove.
if (failures) {
  console.log(`\n${failures} mismatch(es) across ${compared} agenc(ies)`);
  process.exit(1);
}
if (!compared) {
  console.log(
    `\nNOTHING VERIFIED — ${skipped} agenc(ies) skipped, nothing was compared.`
  );
  process.exit(2);
}
console.log(
  `\nledger parity: no differences across ${compared} agenc(ies)` +
    (skipped ? `, ${skipped} skipped` : "")
);
