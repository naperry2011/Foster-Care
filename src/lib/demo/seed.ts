import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { makeSlug } from "@/lib/slug";
import { FIRST_NAMES, LAST_NAMES, CALL_NOTES, INBOUND_REPLIES } from "./names";

// A fixed seed, so the demo agency looks identical every single time. Screen-
// shots stay valid and nothing surprises you in front of a buyer.
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

const DAY = 86400000;
const iso = (daysAgo: number) => new Date(Date.now() - daysAgo * DAY).toISOString();
const dateOnly = (daysAgo: number) => iso(daysAgo).slice(0, 10);

// The shape of this list is the argument the ledger makes: word of mouth and
// church fairs produce homes cheaply, paid media does not.
const SOURCES = [
  { key: "grace", kind: "event", name: "Grace Community fall festival", cost: 0, hours: 6, daysAgo: 520, location: "Mesa" },
  { key: "harvest", kind: "event", name: "Harvest Church family night", cost: 12000, hours: 8, daysAgo: 430, location: "Gilbert" },
  { key: "county", kind: "event", name: "Maricopa County fair booth", cost: 45000, hours: 22, daysAgo: 300, location: "Phoenix" },
  { key: "spring", kind: "event", name: "Spring resource fair", cost: 8000, hours: 5, daysAgo: 150, location: "Tempe" },
  { key: "amb_dana", kind: "ambassador", name: "Dana Whitcomb (foster parent)", cost: 0, hours: 3, daysAgo: 480 },
  { key: "amb_luis", kind: "ambassador", name: "Luis Ortega (foster parent)", cost: 0, hours: 2, daysAgo: 360 },
  { key: "amb_kim", kind: "ambassador", name: "Kim Begay (foster parent)", cost: 0, hours: 4, daysAgo: 240 },
  { key: "social", kind: "digital", name: "Paid social — Meta campaign", cost: 940000, hours: 30, daysAgo: 400 },
  { key: "radio", kind: "digital", name: "Radio buy — Q2", cost: 620000, hours: 12, daysAgo: 210 },
  { key: "partner", kind: "partner", name: "Desert Ridge pediatrics referral", cost: 0, hours: 1, daysAgo: 190 },
  { key: "walkin", kind: "walk_in", name: "Walk-ins & phone calls", cost: 0, hours: 0, daysAgo: 540 },
] as const;

type Plan = {
  sourceKey: string;
  stage: string;
  capturedDaysAgo: number;
  /** licensed this many days after capture */
  licensedAfter?: number;
  /** entered not_yet, then came back — the waiting room's whole argument */
  waitingRoom?: { heldDaysAfter: number; wakeDaysAfter: number };
  consent?: boolean;
};

// How many people each source produced, and what became of them.
const MIX: Record<string, { total: number; licensed: number; inquiry: number; notYet: number; considering: number }> = {
  grace:   { total: 41, licensed: 5, inquiry: 2, notYet: 11, considering: 6 },
  harvest: { total: 28, licensed: 3, inquiry: 2, notYet: 8, considering: 5 },
  county:  { total: 52, licensed: 2, inquiry: 3, notYet: 12, considering: 8 },
  spring:  { total: 19, licensed: 1, inquiry: 2, notYet: 6, considering: 5 },
  amb_dana:{ total: 14, licensed: 4, inquiry: 1, notYet: 3, considering: 3 },
  amb_luis:{ total: 9,  licensed: 2, inquiry: 1, notYet: 2, considering: 2 },
  amb_kim: { total: 7,  licensed: 2, inquiry: 1, notYet: 1, considering: 2 },
  social:  { total: 63, licensed: 1, inquiry: 2, notYet: 5, considering: 7 },
  radio:   { total: 17, licensed: 0, inquiry: 0, notYet: 2, considering: 2 },
  partner: { total: 11, licensed: 2, inquiry: 1, notYet: 2, considering: 3 },
  walkin:  { total: 8,  licensed: 1, inquiry: 1, notYet: 2, considering: 2 },
};

export type SeedResult = { sources: number; contacts: number; licensed: number; waitingRoomWins: number };

export async function seedDemoAgency(
  supabase: SupabaseClient,
  agencyId: string,
  userId: string
): Promise<SeedResult> {
  const rand = rng(20260726);
  const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)];

  // ---- sources ----
  const sourceRows = SOURCES.map((s) => ({
    agency_id: agencyId,
    kind: s.kind,
    name: s.name,
    slug: makeSlug(s.name),
    owner_user_id: userId,
    cost_cents: s.cost,
    hours_invested: s.hours,
    occurred_on: dateOnly(s.daysAgo),
    location: "location" in s ? s.location : null,
  }));
  const { data: sources, error: srcErr } = await supabase
    .from("source")
    .insert(sourceRows)
    .select("id, name");
  if (srcErr) throw srcErr;
  const idByName = new Map(sources!.map((s) => [s.name, s.id]));
  const sourceId = (key: string) =>
    idByName.get(SOURCES.find((s) => s.key === key)!.name)!;

  // ---- decide everyone's story before writing anything ----
  const plans: Plan[] = [];
  for (const s of SOURCES) {
    const m = MIX[s.key];
    const spread = Math.max(1, s.daysAgo - 30);
    for (let i = 0; i < m.total; i++) {
      const captured = s.daysAgo - Math.floor(rand() * Math.min(spread, 45));
      const n = i;
      let stage = "curious";
      let licensedAfter: number | undefined;
      let waitingRoom: Plan["waitingRoom"];

      if (n < m.licensed) {
        stage = "licensed";
        licensedAfter = 150 + Math.floor(rand() * 240);
      } else if (n < m.licensed + m.inquiry) {
        stage = "inquiry";
      } else if (n < m.licensed + m.inquiry + m.notYet) {
        stage = "not_yet";
      } else if (n < m.licensed + m.inquiry + m.notYet + m.considering) {
        stage = "considering";
      } else if (rand() < 0.12) {
        stage = "declined";
      }

      // The dozen deliberate waiting-room conversions: captured at a fair,
      // said "not yet", woke up over a year later, became a home. This is the
      // most persuasive object in the demo, so it is built on purpose.
      const isConversion =
        stage === "licensed" &&
        ["grace", "harvest", "county", "amb_dana", "partner"].includes(s.key) &&
        captured > 380 &&
        rand() < 0.75;
      if (isConversion) {
        waitingRoom = { heldDaysAfter: 20, wakeDaysAfter: 400 };
        licensedAfter = 430 + Math.floor(rand() * 60);
      }

      plans.push({
        sourceKey: s.key,
        stage,
        capturedDaysAgo: Math.max(3, captured),
        licensedAfter,
        waitingRoom,
        consent: rand() > 0.15,
      });
    }
  }

  // ---- contacts ----
  const contactRows = plans.map((p, i) => {
    const first = FIRST_NAMES[i % FIRST_NAMES.length];
    const last = LAST_NAMES[(i * 7) % LAST_NAMES.length];
    const hasPhone = rand() > 0.45;
    return {
      agency_id: agencyId,
      source_id: sourceId(p.sourceKey),
      captured_by_user_id: userId,
      captured_at: iso(p.capturedDaysAgo),
      first_name: first,
      last_name: last,
      email: `${first.toLowerCase()}.${last.toLowerCase().replace(/[^a-z]/g, "")}${i}@porchlight.demo`,
      phone: hasPhone ? `602-555-${String(1000 + i).slice(-4)}` : null,
      stage: p.stage,
      wake_up_on:
        p.stage === "not_yet"
          ? dateOnly(p.capturedDaysAgo - 380 > 0 ? p.capturedDaysAgo - 380 : -120)
          : null,
      consent_email: !!p.consent,
      consent_sms: !!p.consent && hasPhone,
      notes: rand() < 0.25 ? pick(CALL_NOTES) : null,
    };
  });

  const contactIds: string[] = [];
  for (let i = 0; i < contactRows.length; i += 100) {
    const { data, error } = await supabase
      .from("contact")
      .insert(contactRows.slice(i, i + 100))
      .select("id");
    if (error) throw error;
    contactIds.push(...data!.map((c) => c.id));
  }

  // ---- stage history, outcomes, touches ----
  const stageRows: Record<string, unknown>[] = [];
  const outcomeRows: Record<string, unknown>[] = [];
  const touchRows: Record<string, unknown>[] = [];
  let waitingRoomWins = 0;

  plans.forEach((p, i) => {
    const cid = contactIds[i];
    if (!cid) return;
    const cap = p.capturedDaysAgo;
    const at = (daysAfterCapture: number) => iso(Math.max(0, cap - daysAfterCapture));

    stageRows.push({
      agency_id: agencyId, contact_id: cid, from_stage: null, to_stage: "curious",
      occurred_at: iso(cap), actor_user_id: userId, reason: "captured at event",
    });

    if (p.waitingRoom) {
      waitingRoomWins++;
      stageRows.push(
        { agency_id: agencyId, contact_id: cid, from_stage: "curious", to_stage: "considering", occurred_at: at(8), actor_user_id: userId },
        { agency_id: agencyId, contact_id: cid, from_stage: "considering", to_stage: "not_yet", occurred_at: at(p.waitingRoom.heldDaysAfter), actor_user_id: userId, reason: "ask me in two years" },
        { agency_id: agencyId, contact_id: cid, from_stage: "not_yet", to_stage: "considering", occurred_at: at(p.waitingRoom.wakeDaysAfter), actor_user_id: userId, reason: "wake-up date arrived" },
        { agency_id: agencyId, contact_id: cid, from_stage: "considering", to_stage: "inquiry", occurred_at: at(p.waitingRoom.wakeDaysAfter + 20), actor_user_id: userId },
        { agency_id: agencyId, contact_id: cid, from_stage: "inquiry", to_stage: "licensed", occurred_at: at(p.licensedAfter!), actor_user_id: userId }
      );
      outcomeRows.push({
        agency_id: agencyId, contact_id: cid,
        licensed_on: dateOnly(Math.max(0, cap - p.licensedAfter!)),
        confirmed_by_user_id: userId,
      });
    } else if (p.stage === "licensed") {
      stageRows.push(
        { agency_id: agencyId, contact_id: cid, from_stage: "curious", to_stage: "considering", occurred_at: at(10), actor_user_id: userId },
        { agency_id: agencyId, contact_id: cid, from_stage: "considering", to_stage: "inquiry", occurred_at: at(40), actor_user_id: userId },
        { agency_id: agencyId, contact_id: cid, from_stage: "inquiry", to_stage: "licensed", occurred_at: at(p.licensedAfter!), actor_user_id: userId }
      );
      outcomeRows.push({
        agency_id: agencyId, contact_id: cid,
        licensed_on: dateOnly(Math.max(0, cap - p.licensedAfter!)),
        confirmed_by_user_id: userId,
      });
    } else if (p.stage !== "curious") {
      stageRows.push({
        agency_id: agencyId, contact_id: cid, from_stage: "curious", to_stage: p.stage,
        occurred_at: at(12), actor_user_id: userId,
        reason: p.stage === "not_yet" ? "not right now" : null,
      });
    }

    // a believable trail of contact for about a third of people
    if (rand() < 0.35) {
      touchRows.push({
        agency_id: agencyId, contact_id: cid, direction: "out", channel: "email",
        occurred_at: at(3), body: "[auto] Thanks for stopping by",
      });
    }
    if (rand() < 0.18) {
      touchRows.push({
        agency_id: agencyId, contact_id: cid, direction: "in", channel: "email",
        occurred_at: at(6), body: pick(INBOUND_REPLIES),
      });
    }
    if (rand() < 0.15) {
      touchRows.push({
        agency_id: agencyId, contact_id: cid, direction: "in", channel: "call",
        occurred_at: at(9), body: pick(CALL_NOTES), created_by_user_id: userId,
      });
    }
  });

  const insertAll = async (table: string, rows: Record<string, unknown>[]) => {
    for (let i = 0; i < rows.length; i += 200) {
      const { error } = await supabase.from(table).insert(rows.slice(i, i + 200));
      if (error) throw error;
    }
  };
  await insertAll("stage_change", stageRows);
  await insertAll("outcome", outcomeRows);
  await insertAll("touch", touchRows);

  // a couple of things genuinely waiting on a human
  await supabase.from("task").insert([
    {
      agency_id: agencyId,
      contact_id: contactIds[3] ?? null,
      kind: "reply",
      title: "Someone replied — automation paused, they're waiting on a human.",
    },
    {
      agency_id: agencyId,
      kind: "outcome_confirm",
      dedupe_key: `outcome_confirm:demo-${dateOnly(0).slice(0, 7)}`,
      title: "Monthly check: 6 families have been at inquiry for 60+ days. Any of them licensed yet?",
    },
  ]);

  await supabase
    .from("agency")
    .update({ demo_seeded_at: new Date().toISOString() })
    .eq("id", agencyId);

  return {
    sources: sourceRows.length,
    contacts: contactIds.length,
    licensed: outcomeRows.length,
    waitingRoomWins,
  };
}
