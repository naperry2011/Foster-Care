// Exercises /api/cron/tick: wake-ups, cold flags, nurture due-ness.
// Seeds backdated data (which the UI can't create), hits the live endpoint, asserts, cleans up.
import { loadEnv, makeClients, purgeAgency } from "./lib.mjs";

const env = loadEnv(process.argv[2] ?? ".env.local");
const { admin } = makeClients(env);

const results = [];
const pass = (n, d = "") => { results.push(["PASS", n, d]); console.log(`  PASS  ${n}${d ? " — " + d : ""}`); };
const fail = (n, d = "") => { results.push(["FAIL", n, d]); console.log(`  FAIL  ${n}${d ? " — " + d : ""}`); };
const daysAgo = (n) => new Date(Date.now() - n * 864e5).toISOString();

const stamp = Date.now();
let agencyId;
try {
  const { data: ag } = await admin.from("agency").insert({ name: `Cron Smoke ${stamp}` }).select("id").single();
  agencyId = ag.id;
  const { data: src } = await admin.from("source")
    .insert({ agency_id: agencyId, kind: "event", name: "Cron Fair", slug: `cron-${stamp}` })
    .select("id").single();

  const mk = async (over) => {
    const { data } = await admin.from("contact").insert({
      agency_id: agencyId, source_id: src.id, captured_at: daysAgo(120), ...over,
    }).select("id").single();
    return data.id;
  };

  // 1. waiting-room contact whose wake-up date has arrived
  const waker = await mk({
    email: `wake.${stamp}@example.test`, first_name: "Wanda",
    stage: "not_yet", wake_up_on: "2026-01-01", consent_email: true,
  });
  // 2. considering contact, silent for 60 days -> cold flag
  const cold = await mk({
    email: `cold.${stamp}@example.test`, first_name: "Cody", stage: "considering", consent_email: true,
  });
  await admin.from("stage_change").insert({
    agency_id: agencyId, contact_id: cold, from_stage: "curious", to_stage: "considering", occurred_at: daysAgo(60),
  });
  await admin.from("touch").insert({
    agency_id: agencyId, contact_id: cold, direction: "out", channel: "email", occurred_at: daysAgo(60), body: "old",
  });
  // 3. considering contact with no consent -> must never be emailed
  const noConsent = await mk({
    email: `noconsent.${stamp}@example.test`, stage: "considering", consent_email: false,
  });
  await admin.from("stage_change").insert({
    agency_id: agencyId, contact_id: noConsent, from_stage: "curious", to_stage: "considering", occurred_at: daysAgo(30),
  });
  // 4. opted-out contact -> must never be emailed
  const optedOut = await mk({
    email: `optout.${stamp}@example.test`, stage: "considering", consent_email: true, opted_out_at: daysAgo(5),
  });
  await admin.from("stage_change").insert({
    agency_id: agencyId, contact_id: optedOut, from_stage: "curious", to_stage: "considering", occurred_at: daysAgo(30),
  });
  // 5. a family sitting at inquiry for months with no confirmed outcome —
  //    what the monthly outcome_confirm nudge exists for
  await mk({ email: `inquiry.${stamp}@example.test`, first_name: "Iris", stage: "inquiry" });

  console.log("\n== Cron tick");
  const res = await fetch("http://localhost:3000/api/cron/tick", {
    headers: { authorization: `Bearer ${env.CRON_SECRET}` },
  });
  const body = await res.json();
  console.log("  response:", JSON.stringify(body));
  res.ok ? pass("cron tick returns 200") : fail("cron tick returns 200", res.status);

  const { data: tasks } = await admin.from("task").select("kind,title,contact_id").eq("agency_id", agencyId);
  const kinds = (tasks ?? []).map((t) => t.kind);
  kinds.includes("wake_up") ? pass("wake-up task created", tasks.find((t) => t.kind === "wake_up").title)
                            : fail("wake-up task created", `tasks: ${kinds}`);
  kinds.includes("cold_flag") ? pass("cold flag raised for silent 'considering' contact")
                              : fail("cold flag raised", `tasks: ${kinds}`);

  // The promised date must survive; wake_up_fired_at is what stops a repeat.
  const { data: w } = await admin.from("contact")
    .select("wake_up_on, wake_up_fired_at").eq("id", waker).single();
  w.wake_up_on === "2026-01-01" && w.wake_up_fired_at
    ? pass("woken contact keeps its promised date", `wake_up_on ${w.wake_up_on}, fired`)
    : fail("woken contact keeps its promised date",
        `wake_up_on=${w.wake_up_on} fired_at=${w.wake_up_fired_at}`);

  const { data: sends } = await admin.from("send_log").select("contact_id,status,dedupe_key").eq("agency_id", agencyId);
  const emailed = new Set((sends ?? []).map((s) => s.contact_id));
  !emailed.has(noConsent) ? pass("no-consent contact was never sent to")
                          : fail("no-consent contact was never sent to", "CONSENT BYPASSED");
  !emailed.has(optedOut) ? pass("opted-out contact was never sent to")
                         : fail("opted-out contact was never sent to", "OPT-OUT BYPASSED");
  console.log(`  (send_log rows: ${JSON.stringify(sends)})`);

  // second tick: idempotency
  const res2 = await fetch("http://localhost:3000/api/cron/tick", {
    headers: { authorization: `Bearer ${env.CRON_SECRET}` },
  });
  const body2 = await res2.json();
  console.log("  second tick:", JSON.stringify(body2));
  const { data: tasks2 } = await admin.from("task").select("kind,title").eq("agency_id", agencyId);
  tasks2.filter((t) => t.kind === "wake_up").length === 1
    ? pass("re-running cron does not duplicate wake-up tasks")
    : fail("re-running cron does not duplicate wake-up tasks", `${tasks2.filter((t) => t.kind === "wake_up").length} tasks`);
  // two distinct silent 'considering' contacts => two flags, but never more
  body2.coldFlags === 0 && tasks2.filter((t) => t.kind === "cold_flag").length === 2
    ? pass("re-running cron does not duplicate cold flags", "1 open flag per contact")
    : fail("re-running cron does not duplicate cold flags", `${tasks2.filter((t) => t.kind === "cold_flag").length} tasks, 2nd tick raised ${body2.coldFlags}`);

  const { data: sends2 } = await admin.from("send_log").select("id,status,dedupe_key").eq("agency_id", agencyId);
  (sends2 ?? []).length === 0
    ? pass("unsendable email leaves no burnt dedupe key (will retry)")
    : fail("unsendable email leaves no burnt dedupe key",
        `${sends2.length} rows would block forever: ${sends2.map((s) => s.dedupe_key + "=" + s.status)}`);

  // the monthly outcome-confirmation habit the ledger depends on
  const oc = tasks2.filter((t) => t.kind === "outcome_confirm");
  oc.length === 1
    ? pass("outcome_confirm task raised once per month", oc[0].title)
    : fail("outcome_confirm task raised once per month", `${oc.length} tasks`);
} catch (e) {
  fail("UNCAUGHT", e.stack?.split("\n")[0]);
} finally {
  if (agencyId) await purgeAgency(env, admin, agencyId);
  console.log("\ncleanup done");
  const failed = results.filter((r) => r[0] === "FAIL");
  console.log(`${results.filter((r) => r[0] === "PASS").length} passed, ${failed.length} failed`);
  failed.forEach((f) => console.log(` - ${f[1]}: ${f[2]}`));
}
