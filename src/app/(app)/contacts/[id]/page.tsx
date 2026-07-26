import Link from "next/link";
import { notFound } from "next/navigation";
import StageSelect from "@/components/StageSelect";
import ContactTimeline from "@/components/ContactTimeline";
import DangerZone from "@/components/DangerZone";
import JourneyPanel, { type JourneyStep } from "@/components/JourneyPanel";
import { createClient } from "@/lib/supabase/server";
import { STAGE_LABELS, type Stage } from "@/lib/stages";
import { buildTimeline, relativeDays, TOUCH_CHANNEL_LABELS } from "@/lib/timeline";
import {
  logManualTouch,
  updateContactNotes,
  resumeAutomation,
  completeTask,
} from "../actions";

export default async function ContactPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: contact } = await supabase
    .from("contact")
    .select(
      "id, first_name, last_name, phone, email, stage, wake_up_on, wake_up_fired_at, captured_at, consent_email, consent_sms, opted_out_at, automation_paused_at, notes, source(id, name, kind)"
    )
    .eq("id", id)
    .maybeSingle();
  if (!contact) notFound();

  const [{ data: touches }, { data: stageChanges }, { data: sends }, { data: tasks }] =
    await Promise.all([
      supabase
        .from("touch")
        .select("id, direction, channel, occurred_at, body")
        .eq("contact_id", id)
        .order("occurred_at", { ascending: false }),
      supabase
        .from("stage_change")
        .select("id, from_stage, to_stage, occurred_at, reason")
        .eq("contact_id", id),
      supabase
        .from("send_log")
        .select("id, dedupe_key, status, sent_at, nurture_template(subject)")
        .eq("contact_id", id),
      supabase
        .from("task")
        .select("id, kind, title, created_at, done_at")
        .eq("contact_id", id),
    ]);

  // Onboarding checklist. `detail` is read live from the catalog rather than
  // from the snapshot, so improving the guidance helps families already in
  // progress without rewriting what was asked of them.
  const { data: journey } = await supabase
    .from("journey")
    .select("id, started_on, completed_on, journey_step(id, requirement_code, step_no, label, category, completed_on)")
    .eq("contact_id", id)
    .maybeSingle();

  const { data: requirements } = await supabase
    .from("journey_requirement")
    .select("code, detail")
    .eq("active", true);
  const details = new Map(
    (requirements ?? [])
      .filter((r) => r.detail)
      .map((r) => [r.code as string, r.detail as string])
  );

  const entries = buildTimeline({
    touches: touches ?? [],
    stageChanges: stageChanges ?? [],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sends: (sends ?? []) as any,
    tasks: tasks ?? [],
  });

  const src = contact.source as unknown as {
    id: string;
    name: string;
    kind: string;
  } | null;
  const name =
    [contact.first_name, contact.last_name].filter(Boolean).join(" ") ||
    contact.phone ||
    contact.email ||
    "Unnamed contact";
  const openTasks = (tasks ?? []).filter((t) => !t.done_at);

  return (
    <main className="max-w-5xl mx-auto px-6 py-8">
      <Link href="/contacts" className="text-sm text-sage hover:underline">
        ← All contacts
      </Link>

      <header className="mt-3 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-semibold">{name}</h1>
          <p className="text-muted mt-1 text-sm">
            {[contact.phone, contact.email].filter(Boolean).join(" · ") || "—"}
          </p>
          <p className="font-hand text-xl text-clay mt-2">
            met through {src?.name ?? "an unknown source"},{" "}
            {relativeDays(contact.captured_at)}
          </p>
        </div>
        <div className="shrink-0 w-52">
          <div className="text-xs uppercase tracking-wide text-muted mb-1.5">
            Stage
          </div>
          <StageSelect contactId={contact.id} stage={contact.stage as Stage} />
        </div>
      </header>

      {/* status strip */}
      <div className="mt-5 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full border border-rule bg-white px-3 py-1">
          {STAGE_LABELS[contact.stage as Stage]}
        </span>
        {contact.stage === "not_yet" && contact.wake_up_on && (
          <span className="rounded-full border border-porch/50 bg-butter px-3 py-1 text-ink">
            {contact.wake_up_fired_at
              ? `woke ${contact.wake_up_on}`
              : `wakes ${contact.wake_up_on}`}
          </span>
        )}
        <span
          className={`rounded-full border px-3 py-1 ${
            contact.consent_email
              ? "border-sage/40 bg-sage-tint text-sage"
              : "border-rule bg-paper-2 text-muted"
          }`}
        >
          email {contact.consent_email ? "OK" : "no consent"}
        </span>
        {contact.phone && (
          <span
            className={`rounded-full border px-3 py-1 ${
              contact.consent_sms
                ? "border-sage/40 bg-sage-tint text-sage"
                : "border-rule bg-paper-2 text-muted"
            }`}
          >
            text {contact.consent_sms ? "OK" : "no consent"}
          </span>
        )}
        {contact.opted_out_at && (
          <span className="rounded-full border border-clay/50 bg-clay-tint px-3 py-1 text-clay font-semibold">
            opted out — never contact
          </span>
        )}
      </div>

      {contact.automation_paused_at && (
        <div className="mt-4 rounded-xl border-l-4 border-sage bg-sage-tint p-4 flex items-center justify-between gap-4 flex-wrap">
          <p className="text-sm text-[#2F5347]">
            <strong>Automation is paused.</strong> They wrote to you, so the
            machine stepped back and left this to a human.
          </p>
          <form action={resumeAutomation}>
            <input type="hidden" name="contact_id" value={contact.id} />
            <button className="text-sm rounded-full border border-sage text-sage px-4 py-1.5 hover:bg-white">
              Resume nurture
            </button>
          </form>
        </div>
      )}

      {openTasks.length > 0 && (
        <section className="mt-6 rounded-2xl border border-clay/40 bg-clay-tint/40 p-5">
          <h2 className="font-display font-semibold">Waiting on you</h2>
          <ul className="mt-2 space-y-2">
            {openTasks.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span>{t.title}</span>
                <form action={completeTask}>
                  <input type="hidden" name="task_id" value={t.id} />
                  <input type="hidden" name="contact_id" value={contact.id} />
                  <button className="rounded-full border border-sage text-sage px-3 py-1 text-xs hover:bg-white">
                    Done
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Onboarding only makes sense once a family has actually inquired —
          offering it earlier would turn a warm conversation into paperwork. */}
      {(journey || contact.stage === "inquiry" || contact.stage === "licensed") && (
        <JourneyPanel
          contactId={contact.id}
          stage={contact.stage as Stage}
          journey={
            journey
              ? {
                  id: journey.id,
                  started_on: journey.started_on,
                  completed_on: journey.completed_on,
                }
              : null
          }
          steps={(journey?.journey_step ?? []) as JourneyStep[]}
          details={details}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] mt-8 items-start">
        <section className="rounded-2xl border border-rule bg-white p-6">
          <h2 className="font-display text-xl font-semibold">
            Everything that&apos;s happened
          </h2>
          <p className="text-sm text-muted mb-5">
            The thread that used to break the moment the recruiter drove home.
          </p>
          <ContactTimeline entries={entries} />
        </section>

        <div className="space-y-6">
          <section className="rounded-2xl border border-rule bg-white p-5">
            <h2 className="font-display font-semibold">Log a conversation</h2>
            <p className="text-xs text-muted mt-0.5 mb-3">
              You called, or ran into them. Write it down so the next person
              knows.
            </p>
            <form action={logManualTouch} className="space-y-2">
              <input type="hidden" name="contact_id" value={contact.id} />
              <select
                name="channel"
                defaultValue="call"
                className="w-full rounded-md border border-rule px-3 py-2 text-sm bg-white"
              >
                {Object.entries(TOUCH_CHANNEL_LABELS).map(([v, label]) => (
                  <option key={v} value={v}>
                    {label}
                  </option>
                ))}
              </select>
              <textarea
                name="body"
                rows={3}
                required
                placeholder="Said she's waiting until her youngest starts school…"
                className="w-full rounded-md border border-rule px-3 py-2 text-sm"
              />
              <button className="w-full rounded-full bg-porch text-night font-semibold py-2.5 text-sm hover:brightness-105">
                Add to timeline
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-rule bg-white p-5">
            <h2 className="font-display font-semibold">Notes</h2>
            <form action={updateContactNotes} className="mt-2 space-y-2">
              <input type="hidden" name="contact_id" value={contact.id} />
              <textarea
                name="notes"
                rows={4}
                defaultValue={contact.notes ?? ""}
                placeholder="Anything worth remembering."
                className="w-full rounded-md border border-rule px-3 py-2 text-sm"
              />
              <button className="text-sm rounded-full border border-rule px-4 py-2 hover:bg-paper-2">
                Save notes
              </button>
            </form>
          </section>

          <DangerZone contactId={contact.id} name={name} />
        </div>
      </div>
    </main>
  );
}
