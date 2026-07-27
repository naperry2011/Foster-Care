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
  for (const t of [
    "agency", "app_user", "source", "contact", "touch", "stage_change", "outcome",
    "task", "send_log", "nurture_template",
    // 0007-0009. az_* are public reference data, but "public" means "every
    // signed-in agency", not "the internet" — the anon key ships in the browser.
    "az_geo", "az_metric", "az_stat_source", "az_stat", "agency_target", "agency_county",
    "journey_requirement", "journey", "journey_step", "agency_invite",
  ]) {
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
  const { error: e5 } = await anon.rpc("quick_add_contact", {
    p_source_id: src.id, p_email: "anon-quickadd@example.test",
  });
  const { count: qaCount } = await admin.from("contact")
    .select("*", { count: "exact", head: true })
    .eq("email", "anon-quickadd@example.test");
  e5 && qaCount === 0
    ? ok("quick_add_contact", e5.message.slice(0, 40))
    : hole("quick_add_contact", "anyone can create contacts in any agency");

  const { error: e6 } = await anon.rpc("delete_demo_data", { p_agency_id: agencyId });
  const { count: survived } = await admin.from("contact")
    .select("*", { count: "exact", head: true }).eq("agency_id", agencyId);
  e6 && survived > 0
    ? ok("delete_demo_data", e6.message.slice(0, 40))
    : hole("delete_demo_data", "anyone can bulk-wipe an agency");

  // public_unsubscribe (0011) is deliberately granted to anon: the recipient of
  // an email has no session. So the check is not "can anon call it" but "can
  // anon do anything WITH it beyond opting one known id out". It must not
  // report whether an id exists, and it must not touch anything else.
  const { error: unsubBad, data: unsubBadRet } = await anon.rpc("public_unsubscribe", {
    p_contact_id: "00000000-0000-0000-0000-000000000000",
  });
  !unsubBad && unsubBadRet === false
    ? ok("public_unsubscribe", "unknown id returns false, no error to probe with")
    : hole("public_unsubscribe", `unexpected response: ${unsubBad?.message ?? unsubBadRet}`);

  const { count: stillConsented } = await admin.from("contact")
    .select("*", { count: "exact", head: true })
    .eq("agency_id", agencyId).is("opted_out_at", null);
  stillConsented > 0
    ? ok("public_unsubscribe scope", "a bad id opted nobody out")
    : hole("public_unsubscribe scope", "calling it with a junk id affected real rows");

  // The ledger RPCs (0012) are security invoker, so RLS would hand anon nothing
  // even if they were callable. They are still revoked by name, because ADR-007
  // says the rule is the rule and "it would return empty anyway" is how the
  // journey_requirement hole got in.
  for (const fn of ["ledger_rows", "ledger_waiting_room"]) {
    const { error } = await anon.rpc(fn);
    error
      ? ok(fn, error.message.slice(0, 40))
      : hole(fn, "callable by a signed-out visitor");
  }

  // az_stat is written only by the import script holding the service-role key.
  // If a stranger can insert here, every figure on /arizona becomes untrustworthy.
  const { error: azW } = await anon.from("az_stat").insert({
    metric_id: "children_in_care", geo_id: "az", source_id: "dcs-learnmore",
    period_label: `anon ${stamp}`, value: 1,
  });
  azW ? ok("insert az_stat", "denied") : hole("insert az_stat", "anyone can publish a state statistic");

  const { error: tgtW } = await anon.from("agency_target").insert({
    agency_id: agencyId, label: "anon goal", target_value: 1, unit: "homes",
  });
  tgtW ? ok("insert agency_target", "denied") : hole("insert agency_target", "anyone can write agency goals");

  const { error: e7 } = await anon.rpc("start_journey", { p_contact_id: contactId });
  const { count: jCount } = await admin.from("journey")
    .select("*", { count: "exact", head: true }).eq("contact_id", contactId);
  e7 && !jCount
    ? ok("start_journey", e7.message.slice(0, 40))
    : hole("start_journey", "anyone can open an onboarding record on any contact");

  const { data: newAg, error: e8 } = await anon.rpc("create_agency", { p_name: `anon ${stamp}` });
  if (!e8 && newAg) {
    hole("create_agency", "anyone can create a tenant");
    await admin.from("agency").delete().eq("id", newAg);
  } else ok("create_agency", e8?.message.slice(0, 40) ?? "no-op");

  const { data: invRow } = await admin.from("agency_invite")
    .insert({ agency_id: agencyId, email: `audit.${stamp}@example.test` })
    .select("token").single();
  const { error: e9 } = await anon.rpc("accept_invite", { p_token: invRow.token });
  e9 ? ok("accept_invite", e9.message.slice(0, 40)) : hole("accept_invite", "anyone can join an agency");

  const { data: prev, error: e10 } = await anon.rpc("invite_preview", { p_token: invRow.token });
  e10 || !(prev ?? []).length
    ? ok("invite_preview", "denied")
    : hole("invite_preview", "agency names enumerable by token");

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
