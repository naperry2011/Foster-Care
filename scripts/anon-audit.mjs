// What can a stranger with the (public) anon key actually do?
// The anon key ships in the browser, so anything reachable here is reachable
// by anyone who views source. Only public_capture should work.
import { loadEnv, makeClients, purgeAgency } from "./lib.mjs";

const env = loadEnv(process.argv[2] ?? ".env.local");
const { admin, anon } = makeClients(env);

const out = [];
const ok = (n, d = "") => { out.push(["OK", n]); console.log(`  OK       ${n}${d ? " — " + d : ""}`); };
const hole = (n, d = "") => { out.push(["HOLE", n, d]); console.log(`  EXPOSED  ${n}${d ? " — " + d : ""}`); };

const stamp = Date.now();
let agencyId, contactId;
try {
  const { data: ag } = await admin.from("agency").insert({ name: `Anon Audit ${stamp}` }).select("id").single();
  agencyId = ag.id;
  const { data: src } = await admin.from("source")
    .insert({ agency_id: agencyId, kind: "event", name: "Audit", slug: `audit-${stamp}` }).select("id").single();
  const { data: c } = await admin.from("contact")
    .insert({ agency_id: agencyId, source_id: src.id, email: `audit.${stamp}@example.test`, first_name: "Audit" })
    .select("id").single();
  contactId = c.id;

  console.log("\n== Table reads as anon");
  for (const t of ["agency", "app_user", "source", "contact", "touch", "stage_change", "outcome", "task", "send_log", "nurture_template"]) {
    const { data, error } = await anon.from(t).select("*").limit(1);
    if (error || (data ?? []).length === 0) ok(`read ${t}`, error ? "denied" : "0 rows");
    else hole(`read ${t}`, `${data.length} row(s) readable by anyone`);
  }

  console.log("\n== Table writes as anon");
  const { error: wc } = await anon.from("contact").insert({ agency_id: agencyId, source_id: src.id, email: "x@y.z" });
  wc ? ok("insert contact", "denied") : hole("insert contact", "anyone can write contacts");
  const { error: wa } = await anon.from("agency").insert({ name: "pwned" });
  wa ? ok("insert agency", "denied") : hole("insert agency");
  const { error: wu, count: wuCount } = await anon.from("contact").update({ first_name: "pwned" }, { count: "exact" }).eq("id", contactId);
  wu || wuCount === 0 ? ok("update contact", "denied") : hole("update contact", "anyone can edit contacts");

  console.log("\n== RPCs as anon");
  const { error: e1 } = await anon.rpc("set_contact_stage", { p_contact_id: contactId, p_to_stage: "licensed" });
  e1 ? ok("set_contact_stage", e1.message.slice(0, 40)) : hole("set_contact_stage", "anyone can move stages");
  const { error: e2 } = await anon.rpc("current_agency_id");
  e2 ? ok("current_agency_id", "denied") : ok("current_agency_id", "callable but returns null for anon");
  const { error: e3 } = await anon.rpc("delete_contact", { p_contact_id: contactId });
  const { data: still } = await admin.from("contact").select("id").eq("id", contactId);
  (still ?? []).length === 1
    ? ok("delete_contact", e3 ? e3.message.slice(0, 40) : "no-op")
    : hole("delete_contact", "ANYONE CAN ERASE ANY CONTACT");
  const { data: cap, error: e4 } = await anon.rpc("public_capture", { p_slug: `audit-${stamp}`, p_email: "visitor@example.test" });
  cap && !e4 ? ok("public_capture works (intended)") : hole("public_capture BROKEN", e4?.message);
} catch (e) {
  console.log("  ! " + e.message);
} finally {
  if (agencyId) await purgeAgency(env, admin, agencyId);
  const holes = out.filter((r) => r[0] === "HOLE");
  console.log(`\n${out.length - holes.length} safe, ${holes.length} exposed`);
  holes.forEach((h) => console.log(` !! ${h[1]}: ${h[2]}`));
}
