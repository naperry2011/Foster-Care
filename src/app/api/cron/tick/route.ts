import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/admin";
import { sendNurtureEmail, type NurtureContact, type Template } from "@/lib/send";

export const maxDuration = 300;

// The heartbeat. Runs daily (Vercel cron). Everything it does is driven by
// dates in the database, so it survives deploys and can be re-run safely:
//  1. wake-ups     — waiting-room contacts whose wake_up_on arrived → human task
//  2. nurture      — stage-keyed sequences for curious/considering
//  3. cadence      — quarterly touch for not_yet
//  4. cold flags   — considering contacts gone silent → human task
export async function GET(request: Request) {
  if (
    request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const stats = { wakeUps: 0, nurtureSent: 0, cadenceSent: 0, coldFlags: 0 };

  // ---- 1. wake-ups ----
  const { data: waking } = await admin
    .from("contact")
    .select("id, agency_id, first_name, last_name, phone, email")
    .eq("stage", "not_yet")
    .is("opted_out_at", null)
    .lte("wake_up_on", today);
  for (const c of waking ?? []) {
    const name =
      [c.first_name, c.last_name].filter(Boolean).join(" ") ||
      c.phone ||
      c.email;
    await admin.from("task").insert({
      agency_id: c.agency_id,
      contact_id: c.id,
      kind: "wake_up",
      title: `Wake-up: ${name} said "not yet" — the date they picked is here.`,
    });
    // clear the clock so the task fires once
    await admin.from("contact").update({ wake_up_on: null }).eq("id", c.id);
    stats.wakeUps++;
  }

  // ---- load templates once (global defaults; agency overrides win) ----
  const { data: templates } = await admin
    .from("nurture_template")
    .select("*")
    .eq("active", true);
  const templatesFor = (agencyId: string, stage: string) => {
    const all = (templates ?? []).filter((t) => t.stage === stage);
    const own = all.filter((t) => t.agency_id === agencyId);
    const global = all.filter((t) => t.agency_id === null);
    const merged = new Map(global.map((t) => [t.step_no, t]));
    for (const t of own) merged.set(t.step_no, t);
    return [...merged.values()].sort((a, b) => a.step_no - b.step_no);
  };

  // ---- 2. stage-keyed nurture (curious, considering) ----
  const { data: nurturable } = await admin
    .from("contact")
    .select(
      "id, agency_id, email, first_name, consent_email, opted_out_at, automation_paused_at, stage"
    )
    .in("stage", ["curious", "considering"])
    .eq("consent_email", true)
    .is("opted_out_at", null)
    .is("automation_paused_at", null)
    .not("email", "is", null);

  for (const c of nurturable ?? []) {
    // when did they enter this stage?
    const { data: entry } = await admin
      .from("stage_change")
      .select("occurred_at")
      .eq("contact_id", c.id)
      .eq("to_stage", c.stage)
      .order("occurred_at", { ascending: false })
      .limit(1)
      .single();
    if (!entry) continue;
    const enteredAt = new Date(entry.occurred_at);
    for (const t of templatesFor(c.agency_id, c.stage)) {
      const due = new Date(enteredAt);
      due.setDate(due.getDate() + t.wait_days);
      if (due > new Date()) continue;
      const result = await sendNurtureEmail(
        c as NurtureContact,
        t as Template,
        `nurture:${c.stage}:${t.step_no}`
      );
      // one email per contact per tick — warmth, not a flood. A failure also
      // stops the loop so one bad send can't cascade through every step.
      if (result === "sent") {
        stats.nurtureSent++;
        break;
      }
      if (result === "failed") break;
    }
  }

  // ---- 3. quarterly cadence for the waiting room ----
  const { data: held } = await admin
    .from("contact")
    .select(
      "id, agency_id, email, first_name, consent_email, opted_out_at, automation_paused_at, last_nurture_at, captured_at"
    )
    .eq("stage", "not_yet")
    .eq("consent_email", true)
    .is("opted_out_at", null)
    .is("automation_paused_at", null)
    .not("email", "is", null);

  for (const c of held ?? []) {
    const t = templatesFor(c.agency_id, "not_yet")[0];
    if (!t) continue;
    const last = new Date(c.last_nurture_at ?? c.captured_at);
    const due = new Date(last);
    due.setDate(due.getDate() + t.wait_days); // default 90
    if (due > new Date()) continue;
    const quarter = `${due.getFullYear()}q${Math.floor(due.getMonth() / 3) + 1}`;
    const result = await sendNurtureEmail(
      c as NurtureContact,
      t as Template,
      `cadence:not_yet:${quarter}`
    );
    if (result === "sent") stats.cadenceSent++;
  }

  // ---- 4. cold flags: considering, silent for 30 days ----
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const { data: considering } = await admin
    .from("contact")
    .select("id, agency_id, first_name, last_name, phone, email")
    .eq("stage", "considering")
    .is("opted_out_at", null);
  for (const c of considering ?? []) {
    const { data: lastTouch } = await admin
      .from("touch")
      .select("occurred_at")
      .eq("contact_id", c.id)
      .order("occurred_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lastTouch && new Date(lastTouch.occurred_at) > cutoff) continue;
    const { data: openFlag } = await admin
      .from("task")
      .select("id")
      .eq("contact_id", c.id)
      .eq("kind", "cold_flag")
      .is("done_at", null)
      .maybeSingle();
    if (openFlag) continue;
    const name =
      [c.first_name, c.last_name].filter(Boolean).join(" ") ||
      c.phone ||
      c.email;
    await admin.from("task").insert({
      agency_id: c.agency_id,
      contact_id: c.id,
      kind: "cold_flag",
      title: `Gone quiet: ${name} has been in "considering" with no contact for 30+ days.`,
    });
    stats.coldFlags++;
  }

  return NextResponse.json({ ok: true, ...stats });
}
