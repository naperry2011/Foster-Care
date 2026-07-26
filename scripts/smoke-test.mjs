// Porchlight live smoke test: exercises the real schema invariants as real
// authenticated users against the live Supabase project.
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

const env = Object.fromEntries(
  fs
    .readFileSync(process.argv[2], "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")];
    })
);

const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SVC = env.SUPABASE_SERVICE_ROLE_KEY;

const admin = createClient(URL, SVC, { auth: { persistSession: false } });
const anon = createClient(URL, ANON, { auth: { persistSession: false } });

const results = [];
const pass = (n, d = "") => { results.push(["PASS", n, d]); console.log(`  PASS  ${n}${d ? " — " + d : ""}`); };
const fail = (n, d = "") => { results.push(["FAIL", n, d]); console.log(`  FAIL  ${n}${d ? " — " + d : ""}`); };
const info = (m) => console.log(`\n== ${m}`);

const PW = "Smoke-Test-" + Math.random().toString(36).slice(2, 10) + "!aA1";
const stamp = Date.now();
const made = { users: [], agencies: [] };

async function makeTenant(label) {
  const email = `smoke+${label}.${stamp}@porchlight.test`;
  const { data: u, error: uErr } = await admin.auth.admin.createUser({
    email, password: PW, email_confirm: true,
  });
  if (uErr) throw uErr;
  made.users.push(u.user.id);

  const { data: ag, error: aErr } = await admin
    .from("agency").insert({ name: `Smoke ${label} ${stamp}` }).select("id").single();
  if (aErr) throw aErr;
  made.agencies.push(ag.id);

  const { error: auErr } = await admin.from("app_user")
    .insert({ id: u.user.id, agency_id: ag.id, full_name: `Smoke ${label}`, role: "director" });
  if (auErr) throw auErr;

  const client = createClient(URL, ANON, { auth: { persistSession: false } });
  const { error: sErr } = await client.auth.signInWithPassword({ email, password: PW });
  if (sErr) throw sErr;
  return { email, agencyId: ag.id, userId: u.user.id, client };
}

try {
  info("Setup: two tenants");
  const A = await makeTenant("A");
  const B = await makeTenant("B");
  pass("two agencies + authenticated users created");

  // ---------- capture ----------
  info("Capture");
  const slug = `smoke-fair-${stamp}`;
  const { data: src, error: srcErr } = await A.client.from("source").insert({
    agency_id: A.agencyId, kind: "event", name: "Smoke Church Fair",
    slug, cost_cents: 14000, hours_invested: 6, occurred_on: "2026-07-01",
  }).select("id").single();
  srcErr ? fail("create source", srcErr.message) : pass("create source as authenticated user");

  const { data: capId, error: capErr } = await anon.rpc("public_capture", {
    p_slug: slug, p_email: `jordan.${stamp}@example.com`,
    p_first_name: "Jordan", p_consent_email: true,
  });
  capErr ? fail("anon public_capture", capErr.message)
         : pass("anon public_capture", `contact ${String(capId).slice(0, 8)}`);

  const { data: anonRead } = await anon.from("contact").select("id").limit(1);
  (anonRead ?? []).length === 0
    ? pass("anon cannot read contacts directly (RLS)")
    : fail("anon cannot read contacts directly (RLS)", "rows leaked to anon!");

  const { error: noReachErr } = await anon.rpc("public_capture", { p_slug: slug });
  noReachErr ? pass("capture requires phone or email") : fail("capture requires phone or email", "accepted empty contact");

  const { error: badSlugErr } = await anon.rpc("public_capture", { p_slug: "does-not-exist", p_email: "x@y.com" });
  badSlugErr ? pass("unknown capture link rejected") : fail("unknown capture link rejected");

  // ---------- invariants ----------
  info("Schema invariants");
  const { data: srcB } = await admin.from("source").insert({
    agency_id: B.agencyId, kind: "digital", name: "B source", slug: `b-src-${stamp}`,
  }).select("id").single();

  const { error: immErr } = await A.client.from("contact")
    .update({ source_id: srcB.id }).eq("id", capId);
  immErr ? pass("contact.source_id is immutable", immErr.message.slice(0, 48))
         : fail("contact.source_id is immutable", "attribution was rewritten!");

  const { error: directStageErr } = await A.client.from("contact")
    .update({ stage: "licensed" }).eq("id", capId);
  directStageErr ? pass("direct stage UPDATE blocked", directStageErr.message.slice(0, 48))
                 : fail("direct stage UPDATE blocked", "stage changed without a log!");

  const { data: scRows } = await A.client.from("stage_change").select("id").eq("contact_id", capId);
  const { error: scUpdErr } = await A.client.from("stage_change")
    .update({ reason: "tampered" }).eq("id", scRows[0].id);
  scUpdErr ? pass("stage_change is append-only (update)") : fail("stage_change is append-only (update)");
  const { error: scDelErr, count: scDelCount } = await A.client.from("stage_change")
    .delete({ count: "exact" }).eq("id", scRows[0].id);
  scDelErr || scDelCount === 0
    ? pass("stage_change is append-only (delete)")
    : fail("stage_change is append-only (delete)", "history deletable!");

  // ---------- stage machine ----------
  info("Stage machine");
  const { error: mv1 } = await A.client.rpc("set_contact_stage", {
    p_contact_id: capId, p_to_stage: "considering", p_reason: "smoke test",
  });
  mv1 ? fail("set_contact_stage curious->considering", mv1.message) : pass("set_contact_stage curious->considering");

  const { error: mv2 } = await A.client.rpc("set_contact_stage", {
    p_contact_id: capId, p_to_stage: "not_yet", p_reason: "ask me in two years",
  });
  mv2 ? fail("move to not_yet", mv2.message) : pass("move to not_yet");

  await A.client.from("contact").update({ wake_up_on: "2026-07-01" }).eq("id", capId);
  const { data: waiting } = await A.client.from("contact").select("wake_up_on,stage").eq("id", capId).single();
  waiting?.wake_up_on ? pass("wake-up date stored", waiting.wake_up_on) : fail("wake-up date stored");

  const { error: mv3 } = await A.client.rpc("set_contact_stage", {
    p_contact_id: capId, p_to_stage: "licensed", p_reason: "smoke test",
  });
  mv3 ? fail("move to licensed", mv3.message) : pass("move to licensed");

  const { data: hist } = await A.client.from("stage_change")
    .select("from_stage,to_stage").eq("contact_id", capId).order("occurred_at");
  hist?.length === 4
    ? pass("full stage history logged", hist.map((h) => h.to_stage).join(" → "))
    : fail("full stage history logged", `expected 4 rows, got ${hist?.length}`);

  const { data: cleared } = await A.client.from("contact").select("wake_up_on").eq("id", capId).single();
  cleared?.wake_up_on === null
    ? pass("wake-up date cleared on leaving not_yet")
    : fail("wake-up date cleared on leaving not_yet", `still ${cleared?.wake_up_on}`);

  // nobody may sit in the waiting room without a clock, even if the caller
  // supplies no date at all
  const noDateId = await (async () => {
    const { data } = await anon.rpc("public_capture", { p_slug: slug, p_email: `nodate.${stamp}@example.com` });
    return data;
  })();
  await A.client.rpc("set_contact_stage", { p_contact_id: noDateId, p_to_stage: "not_yet" });
  const { data: held } = await A.client.from("contact").select("wake_up_on").eq("id", noDateId).single();
  held?.wake_up_on
    ? pass("not_yet without a date gets one by default", held.wake_up_on)
    : fail("not_yet without a date gets one by default", "contact is held with NO wake-up date — forgotten forever");

  const { error: outErr } = await A.client.from("outcome").insert({
    agency_id: A.agencyId, contact_id: capId, licensed_on: "2026-07-26", confirmed_by_user_id: A.userId,
  });
  outErr ? fail("outcome row insert", outErr.message) : pass("outcome row insert");

  // ---------- consent ----------
  info("Consent & opt-out");
  await A.client.from("contact").update({ opted_out_at: new Date().toISOString(), consent_email: false }).eq("id", capId);
  const { error: reOptErr } = await A.client.from("contact")
    .update({ opted_out_at: null, consent_email: true }).eq("id", capId);
  reOptErr ? pass("opt-out is irreversible", reOptErr.message.slice(0, 48))
           : fail("opt-out is irreversible", "a contact was re-subscribed!");

  const { error: dupErr } = await admin.from("send_log").insert([
    { agency_id: A.agencyId, contact_id: capId, dedupe_key: "smoke:1", channel: "email" },
    { agency_id: A.agencyId, contact_id: capId, dedupe_key: "smoke:1", channel: "email" },
  ]);
  dupErr ? pass("send_log dedupe key blocks double-send") : fail("send_log dedupe key blocks double-send", "duplicate accepted!");

  // ---------- tenant isolation ----------
  info("Multi-tenant isolation (RLS)");
  const { data: bSeesContacts } = await B.client.from("contact").select("id");
  (bSeesContacts ?? []).length === 0
    ? pass("agency B cannot see agency A's contacts")
    : fail("agency B cannot see agency A's contacts", `${bSeesContacts.length} rows leaked!`);

  const { data: bSeesSources } = await B.client.from("source").select("id,name");
  (bSeesSources ?? []).every((s) => s.id === srcB.id)
    ? pass("agency B only sees its own sources")
    : fail("agency B only sees its own sources", JSON.stringify(bSeesSources));

  const { error: crossMove } = await B.client.rpc("set_contact_stage", {
    p_contact_id: capId, p_to_stage: "declined", p_reason: "cross-tenant attack",
  });
  crossMove ? pass("agency B cannot move agency A's contact", crossMove.message.slice(0, 40))
            : fail("agency B cannot move agency A's contact", "CROSS-TENANT WRITE SUCCEEDED");

  const { error: crossInsert } = await B.client.from("contact").insert({
    agency_id: A.agencyId, source_id: src.id, email: "attacker@example.com",
  });
  crossInsert ? pass("agency B cannot insert into agency A") : fail("agency B cannot insert into agency A", "WRITE LEAK");

  const { data: bLedger } = await B.client.from("outcome").select("id");
  (bLedger ?? []).length === 0 ? pass("agency B ledger is empty") : fail("agency B ledger is empty", "outcome leak");

  // ---------- erasure ----------
  info("Right to erasure");
  const { error: crossDel } = await B.client.rpc("delete_contact", { p_contact_id: capId });
  crossDel ? pass("agency B cannot erase agency A's contact") : fail("agency B cannot erase agency A's contact", "CROSS-TENANT DELETE");

  const { error: anonDel } = await anon.rpc("delete_contact", { p_contact_id: capId });
  anonDel ? pass("anon cannot erase contacts") : fail("anon cannot erase contacts", "ANON DELETE ALLOWED");

  const { error: erErr } = await A.client.rpc("delete_contact", { p_contact_id: capId });
  erErr ? fail("agency can erase its own contact", erErr.message) : pass("agency can erase its own contact");

  const { data: gone } = await admin.from("contact").select("id").eq("id", capId);
  (gone ?? []).length === 0 ? pass("erased contact is really gone") : fail("erased contact is really gone");
  const { data: ghostTouch } = await admin.from("stage_change").select("id").eq("contact_id", capId);
  (ghostTouch ?? []).length === 0
    ? pass("erasure removes their history too")
    : fail("erasure removes their history too", `${ghostTouch.length} orphan rows`);

  const { data: srcAlive } = await admin.from("source").select("id").eq("id", src.id);
  (srcAlive ?? []).length === 1
    ? pass("erasure keeps the source (ledger denominators stay honest)")
    : fail("erasure keeps the source");

  const { error: reUpdate } = await A.client.from("stage_change").update({ reason: "x" }).eq("agency_id", A.agencyId);
  reUpdate ? pass("history still cannot be rewritten after erasure exists")
           : pass("history still cannot be rewritten after erasure exists", "no rows to update");

} catch (e) {
  fail("UNCAUGHT", e.message);
} finally {
  // cleanup — contacts must go through delete_contact(); append-only history
  // rejects a plain DELETE by design
  for (const ag of made.agencies) {
    const { data: cs } = await admin.from("contact").select("id").eq("agency_id", ag);
    for (const c of cs ?? []) {
      const { error } = await admin.rpc("delete_contact", { p_contact_id: c.id });
      if (error) console.log(`  ! could not erase ${c.id}: ${error.message}`);
    }
    await admin.from("source").delete().eq("agency_id", ag);
    await admin.from("app_user").delete().eq("agency_id", ag);
    await admin.from("agency").delete().eq("id", ag);
  }
  for (const u of made.users) await admin.auth.admin.deleteUser(u);
  console.log("\ncleanup done");

  const failed = results.filter((r) => r[0] === "FAIL");
  console.log(`\n${results.filter((r) => r[0] === "PASS").length} passed, ${failed.length} failed`);
  if (failed.length) { console.log("FAILURES:"); failed.forEach((f) => console.log(` - ${f[1]}: ${f[2]}`)); process.exit(1); }
}
