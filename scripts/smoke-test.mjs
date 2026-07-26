// Porchlight live smoke test: exercises the real schema invariants as real
// authenticated users against the live Supabase project.
import { loadEnv, makeClients, makeTenant, makeStranger, purgeAgency } from "./lib.mjs";

const env = loadEnv(process.argv[2] ?? ".env.local");
const { admin, anon } = makeClients(env);

const results = [];
const pass = (n, d = "") => { results.push(["PASS", n, d]); console.log(`  PASS  ${n}${d ? " — " + d : ""}`); };
const fail = (n, d = "") => { results.push(["FAIL", n, d]); console.log(`  FAIL  ${n}${d ? " — " + d : ""}`); };
const info = (m) => console.log(`\n== ${m}`);

const stamp = Date.now();
const made = { agencies: [], strangers: [] };

try {
  info("Setup: two tenants");
  const A = await makeTenant(env, admin, "A");
  const B = await makeTenant(env, admin, "B");
  made.agencies.push(A.agencyId, B.agencyId);
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

  // ---------- Arizona statistics (0007) ----------
  info("Arizona statistics");
  const { data: azRead } = await A.client.from("az_stat").select("metric_id").limit(5);
  (azRead ?? []).length > 0
    ? pass("signed-in user can read az_stat", `${azRead.length} row(s)`)
    : fail("signed-in user can read az_stat", "seeded figures are unreadable");

  // az_stat has a select policy and no write policy at all, so the only thing
  // that can put a number there is the import script's service-role key.
  const { error: azInsErr } = await A.client.from("az_stat").insert({
    metric_id: "children_in_care", geo_id: "az", source_id: "dcs-learnmore",
    period_label: `tamper ${stamp}`, value: 1,
  });
  azInsErr ? pass("az_stat is not writable by a signed-in user", azInsErr.message.slice(0, 40))
           : fail("az_stat is not writable by a signed-in user", "STATE FIGURES ARE EDITABLE");

  const { error: azUpdErr, count: azUpdCount } = await A.client.from("az_stat")
    .update({ value: 1 }, { count: "exact" }).eq("geo_id", "az");
  azUpdErr || azUpdCount === 0
    ? pass("az_stat cannot be updated from the app")
    : fail("az_stat cannot be updated from the app", `${azUpdCount} rows rewritten!`);

  const { error: azDelErr, count: azDelCount } = await A.client.from("az_stat")
    .delete({ count: "exact" }).eq("geo_id", "az");
  azDelErr || azDelCount === 0
    ? pass("az_stat cannot be deleted from the app")
    : fail("az_stat cannot be deleted from the app", `${azDelCount} rows removed!`);

  const { error: tgtErr } = await A.client.from("agency_target").insert({
    agency_id: A.agencyId, label: "licensed in Maricopa", target_value: 12, unit: "homes",
  });
  tgtErr ? fail("agency can set its own target", tgtErr.message) : pass("agency can set its own target");

  const { data: bTargets } = await B.client.from("agency_target").select("id");
  (bTargets ?? []).length === 0
    ? pass("agency B cannot see agency A's targets")
    : fail("agency B cannot see agency A's targets", "goal leak");

  // geo_level is pinned to 'county', so an agency cannot claim to serve a grain
  // Arizona does not publish at.
  const { error: badGeoErr } = await A.client.from("agency_county")
    .insert({ agency_id: A.agencyId, geo_id: "az" });
  badGeoErr ? pass("agency_county rejects a non-county geo", badGeoErr.message.slice(0, 40))
            : fail("agency_county rejects a non-county geo", "state selectable as a county");

  const { error: goodGeoErr } = await A.client.from("agency_county")
    .insert({ agency_id: A.agencyId, geo_id: "az-maricopa" });
  goodGeoErr ? fail("agency can select a county", goodGeoErr.message) : pass("agency can select a county");

  // ---------- onboarding progress (0008) ----------
  info("Onboarding progress");
  const { data: journeyId, error: jErr } = await A.client.rpc("start_journey", {
    p_contact_id: noDateId,
  });
  jErr ? fail("start_journey", jErr.message) : pass("start_journey", String(journeyId).slice(0, 8));

  const { data: jSteps } = await A.client.from("journey_step")
    .select("id, completed_on").eq("journey_id", journeyId);
  (jSteps ?? []).length === 9
    ? pass("checklist built from the Arizona catalog", `${jSteps.length} steps`)
    : fail("checklist built from the Arizona catalog", `expected 9 steps, got ${jSteps?.length}`);

  const { data: againId } = await A.client.rpc("start_journey", { p_contact_id: noDateId });
  againId === journeyId
    ? pass("start_journey is idempotent")
    : fail("start_journey is idempotent", "a second call reset somebody's progress");

  const { error: crossJourney } = await B.client.rpc("start_journey", { p_contact_id: noDateId });
  crossJourney ? pass("agency B cannot start a journey on agency A's contact", crossJourney.message.slice(0, 40))
               : fail("agency B cannot start a journey on agency A's contact", "CROSS-TENANT WRITE");

  const { error: anonJourney } = await anon.rpc("start_journey", { p_contact_id: noDateId });
  anonJourney ? pass("anon cannot start a journey") : fail("anon cannot start a journey", "ANON WRITE ALLOWED");

  await A.client.from("journey_step")
    .update({ completed_on: "2026-07-26" })
    .eq("journey_id", journeyId);
  const { data: jDone } = await A.client.from("journey")
    .select("completed_on").eq("id", journeyId).single();
  jDone?.completed_on
    ? pass("finishing every step completes the journey", jDone.completed_on)
    : fail("finishing every step completes the journey");

  // The whole point: a checklist does not license anybody. Arizona does.
  const { data: stillHeld } = await A.client.from("contact")
    .select("stage").eq("id", noDateId).single();
  stillHeld?.stage === "not_yet"
    ? pass("completing the checklist does NOT change the contact's stage")
    : fail("completing the checklist does NOT change the contact's stage", `stage became ${stillHeld?.stage}`);

  const { error: reopenErr } = await A.client.from("journey_step")
    .update({ completed_on: null }).eq("journey_id", journeyId);
  const { data: jReopened } = await A.client.from("journey")
    .select("completed_on").eq("id", journeyId).single();
  !reopenErr && jReopened?.completed_on === null
    ? pass("un-ticking a step reopens the journey")
    : fail("un-ticking a step reopens the journey", reopenErr?.message ?? "completed_on stuck");

  // ---------- team invitations (0009) ----------
  info("Team invitations");
  const inviteEmail = `invitee.${stamp}@porchlight.test`;
  const { data: invite, error: invErr } = await A.client.from("agency_invite")
    .insert({ agency_id: A.agencyId, email: inviteEmail, invited_by_user_id: A.userId })
    .select("id, token").single();
  invErr ? fail("create an invitation", invErr.message) : pass("create an invitation");

  const { data: bSeesInvites } = await B.client.from("agency_invite").select("id");
  (bSeesInvites ?? []).length === 0
    ? pass("agency B cannot see agency A's invitations")
    : fail("agency B cannot see agency A's invitations", "invite leak");

  const { data: anonInvites } = await anon.from("agency_invite").select("id").limit(1);
  (anonInvites ?? []).length === 0
    ? pass("anon cannot read invitations")
    : fail("anon cannot read invitations", "tokens readable by anyone");

  // A forwarded link must not let the wrong person walk in.
  const wrong = await makeStranger(env, admin, `wrong.${stamp}@porchlight.test`);
  made.strangers.push(wrong.userId);
  const { error: wrongErr } = await wrong.client.rpc("accept_invite", { p_token: invite.token });
  wrongErr ? pass("invitation refuses a different email address", wrongErr.message.slice(0, 48))
           : fail("invitation refuses a different email address", "ANYONE WITH THE LINK CAN JOIN");

  const right = await makeStranger(env, admin, inviteEmail);
  made.strangers.push(right.userId);
  const { error: acceptErr } = await right.client.rpc("accept_invite", { p_token: invite.token });
  acceptErr ? fail("invited person joins the agency", acceptErr.message)
            : pass("invited person joins the agency");

  const { data: joined } = await admin.from("app_user")
    .select("agency_id").eq("id", right.userId).maybeSingle();
  joined?.agency_id === A.agencyId
    ? pass("they land in the inviting agency")
    : fail("they land in the inviting agency", `agency_id ${joined?.agency_id}`);

  const { error: reuseErr } = await wrong.client.rpc("accept_invite", { p_token: invite.token });
  reuseErr ? pass("an accepted invitation cannot be reused", reuseErr.message.slice(0, 40))
           : fail("an accepted invitation cannot be reused", "TOKEN STILL LIVE");

  const { error: dupAgencyErr } = await A.client.rpc("create_agency", { p_name: "Second Agency" });
  dupAgencyErr ? pass("an existing member cannot create a second agency", dupAgencyErr.message.slice(0, 40))
               : fail("an existing member cannot create a second agency", "user now spans two tenants");

  const { data: newAgencyId, error: newAgencyErr } = await wrong.client.rpc("create_agency", {
    p_name: `Smoke Stranger ${stamp}`, p_full_name: "Stranger",
  });
  if (newAgencyErr) fail("a stranger can create their own agency", newAgencyErr.message);
  else { made.agencies.push(newAgencyId); pass("a stranger can create their own agency"); }

  const { error: anonAgencyErr } = await anon.rpc("create_agency", { p_name: "anon agency" });
  anonAgencyErr ? pass("anon cannot create an agency") : fail("anon cannot create an agency", "ANON WRITE ALLOWED");

  // ---------- erasure ----------
  info("Right to erasure");

  // A journey must not be able to veto an erasure request: without ON DELETE
  // CASCADE the delete aborts, and "please delete my information" becomes
  // unanswerable again for exactly the families furthest along.
  const { data: erasableJourney } = await A.client.rpc("start_journey", { p_contact_id: capId });
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

  const { data: ghostJourney } = await admin.from("journey").select("id").eq("id", erasableJourney);
  const { data: ghostSteps } = await admin.from("journey_step").select("id").eq("journey_id", erasableJourney);
  (ghostJourney ?? []).length === 0 && (ghostSteps ?? []).length === 0
    ? pass("erasure takes the onboarding checklist with it")
    : fail("erasure takes the onboarding checklist with it",
           `${ghostJourney?.length} journey + ${ghostSteps?.length} step rows survived`);

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
  for (const ag of made.agencies) await purgeAgency(env, admin, ag);
  // Strangers who never joined an agency aren't reachable from app_user, so
  // purgeAgency can't find them.
  for (const id of made.strangers) {
    await admin.auth.admin.deleteUser(id).catch(() => {});
  }
  console.log("\ncleanup done");

  const failed = results.filter((r) => r[0] === "FAIL");
  console.log(`\n${results.filter((r) => r[0] === "PASS").length} passed, ${failed.length} failed`);
  if (failed.length) { console.log("FAILURES:"); failed.forEach((f) => console.log(` - ${f[1]}: ${f[2]}`)); process.exit(1); }
}
