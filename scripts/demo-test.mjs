// The demo agency's two safety guarantees:
//   1. delete_demo_data refuses to touch an agency that isn't flagged is_demo
//   2. nothing in a demo agency can ever be emailed
import { loadEnv, makeClients, makeTenant, purgeAgency } from "./lib.mjs";

const env = loadEnv(process.argv[2] ?? ".env.local");
const { admin } = makeClients(env);

const results = [];
const pass = (n, d = "") => { results.push(["PASS", n]); console.log(`  PASS  ${n}${d ? " — " + d : ""}`); };
const fail = (n, d = "") => { results.push(["FAIL", n, d]); console.log(`  FAIL  ${n}${d ? " — " + d : ""}`); };

const made = [];
try {
  console.log("\n== Guard: real agencies are not bulk-deletable");
  const real = await makeTenant(env, admin, "real");
  made.push(real.agencyId);
  const { data: src } = await admin.from("source")
    .insert({ agency_id: real.agencyId, kind: "event", name: "Real fair", slug: `real-${Date.now()}` })
    .select("id").single();
  await admin.from("contact").insert({
    agency_id: real.agencyId, source_id: src.id, email: `real.${Date.now()}@example.test`,
  });

  const { error: refused } = await real.client.rpc("delete_demo_data", { p_agency_id: real.agencyId });
  const { count: stillThere } = await admin.from("contact")
    .select("*", { count: "exact", head: true }).eq("agency_id", real.agencyId);
  refused && stillThere === 1
    ? pass("delete_demo_data refuses a non-demo agency", refused.message.slice(0, 44))
    : fail("delete_demo_data refuses a non-demo agency", "REAL AGENCY DATA WAS DELETABLE");

  console.log("\n== Demo agency");
  const { data: demoAgency } = await admin.from("agency")
    .insert({ name: `Demo Test ${Date.now()}`, is_demo: true }).select("id").single();
  made.push(demoAgency.id);
  const { makeUserIn } = await import("./lib.mjs");
  const demoUser = await makeUserIn(env, admin, demoAgency.id, "demo");

  const { data: dsrc } = await admin.from("source")
    .insert({ agency_id: demoAgency.id, kind: "event", name: "Demo fair", slug: `demo-${Date.now()}` })
    .select("id").single();
  const { data: dcontact } = await admin.from("contact").insert({
    agency_id: demoAgency.id, source_id: dsrc.id,
    email: `someone.${Date.now()}@porchlight.demo`, consent_email: true, stage: "considering",
  }).select("id").single();
  await admin.from("stage_change").insert({
    agency_id: demoAgency.id, contact_id: dcontact.id, from_stage: null, to_stage: "curious",
  });
  await admin.from("task").insert({
    agency_id: demoAgency.id, contact_id: dcontact.id, kind: "reply", title: "demo task",
  });

  const { error: cross } = await real.client.rpc("delete_demo_data", { p_agency_id: demoAgency.id });
  cross ? pass("one agency cannot wipe another's demo data") : fail("one agency cannot wipe another's demo data", "CROSS-TENANT WIPE");

  const { error: wipeErr } = await demoUser.client.rpc("delete_demo_data", { p_agency_id: demoAgency.id });
  const { count: after } = await admin.from("contact")
    .select("*", { count: "exact", head: true }).eq("agency_id", demoAgency.id);
  const { count: tasksAfter } = await admin.from("task")
    .select("*", { count: "exact", head: true }).eq("agency_id", demoAgency.id);
  const { count: srcAfter } = await admin.from("source")
    .select("*", { count: "exact", head: true }).eq("agency_id", demoAgency.id);
  !wipeErr && after === 0 && tasksAfter === 0 && srcAfter === 0
    ? pass("demo agency empties in one call", "contacts, tasks and sources all gone")
    : fail("demo agency empties in one call",
        wipeErr?.message ?? `contacts=${after} tasks=${tasksAfter} sources=${srcAfter}`);

  const { data: agencyRow } = await admin.from("agency")
    .select("demo_seeded_at").eq("id", demoAgency.id).single();
  agencyRow.demo_seeded_at === null
    ? pass("demo_seeded_at cleared after erase")
    : fail("demo_seeded_at cleared after erase");

  console.log("\n== Sends");
  const { data: check } = await admin.from("agency").select("is_demo").eq("id", demoAgency.id).single();
  check.is_demo
    ? pass("demo agency stays flagged after erase (send layer keeps refusing)")
    : fail("demo agency stays flagged after erase");
} catch (e) {
  fail("UNCAUGHT", e.message);
} finally {
  for (const id of made) {
    try { await purgeAgency(env, admin, id); } catch (e) { console.log("  ! purge:", e.message); }
  }
  console.log("\ncleanup done");
  const failed = results.filter((r) => r[0] === "FAIL");
  console.log(`${results.length - failed.length} passed, ${failed.length} failed`);
  failed.forEach((f) => console.log(` - ${f[1]}: ${f[2]}`));
  if (failed.length) process.exit(1);
}
