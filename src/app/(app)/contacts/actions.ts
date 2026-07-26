"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Stage } from "@/lib/stages";
import type { TouchChannel } from "@/lib/timeline";

// All stage moves route through the set_contact_stage() RPC so the
// append-only stage_change log can never be skipped.
export async function moveStage(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  const contactId = String(formData.get("contact_id"));
  const toStage = String(formData.get("to_stage")) as Stage;
  const reason = String(formData.get("reason") ?? "").trim() || null;

  // the wake-up date rides along with the stage change; the database defaults
  // one if it's missing, so no contact is ever held without a clock
  const wakeUp = String(formData.get("wake_up_on") ?? "");
  const { error } = await supabase.rpc("set_contact_stage", {
    p_contact_id: contactId,
    p_to_stage: toStage,
    p_reason: reason,
    p_wake_up_on: toStage === "not_yet" && wakeUp ? wakeUp : null,
  });
  if (error) throw error;

  // licensing is the money event — write the outcome the ledger runs on
  if (toStage === "licensed") {
    await supabase.from("outcome").upsert(
      {
        agency_id: user.agencyId,
        contact_id: contactId,
        licensed_on: new Date().toISOString().slice(0, 10),
        confirmed_by_user_id: user.id,
      },
      { onConflict: "contact_id", ignoreDuplicates: true }
    );
  }

  revalidatePath("/board");
  revalidatePath("/contacts");
  revalidatePath("/ledger");
}

export async function updateContactNotes(formData: FormData) {
  await requireUser();
  const supabase = await createClient();
  const id = String(formData.get("contact_id"));
  const notes = String(formData.get("notes") ?? "").trim() || null;

  const { error } = await supabase.from("contact").update({ notes }).eq("id", id);
  if (error) throw error;
  revalidatePath(`/contacts/${id}`);
}

// A recruiter recording a real conversation. Without this the timeline only
// ever shows what the machine did, which is the smaller half of the story.
export async function logManualTouch(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  const id = String(formData.get("contact_id"));
  const channel = String(formData.get("channel") ?? "call") as TouchChannel;
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;

  const { error } = await supabase.from("touch").insert({
    agency_id: user.agencyId,
    contact_id: id,
    direction: "in",
    channel,
    body,
    created_by_user_id: user.id,
  });
  if (error) throw error;
  revalidatePath(`/contacts/${id}`);
}

// Automation pauses itself when someone replies; this un-pauses it once a
// human has actually followed up.
export async function resumeAutomation(formData: FormData) {
  await requireUser();
  const supabase = await createClient();
  const id = String(formData.get("contact_id"));
  const { error } = await supabase
    .from("contact")
    .update({ automation_paused_at: null })
    .eq("id", id);
  if (error) throw error;
  revalidatePath(`/contacts/${id}`);
}

export async function completeTask(formData: FormData) {
  await requireUser();
  const supabase = await createClient();
  const taskId = String(formData.get("task_id"));
  const contactId = String(formData.get("contact_id") ?? "");
  await supabase
    .from("task")
    .update({ done_at: new Date().toISOString() })
    .eq("id", taskId);
  if (contactId) revalidatePath(`/contacts/${contactId}`);
  revalidatePath("/tasks");
}

// Erasure — the whole person, not a soft delete. Goes through delete_contact()
// so the append-only history is removed under its one audited exception.
export async function eraseContact(formData: FormData) {
  await requireUser();
  const supabase = await createClient();
  const id = String(formData.get("contact_id"));

  const { error } = await supabase.rpc("delete_contact", { p_contact_id: id });
  if (error) throw error;

  revalidatePath("/contacts");
  revalidatePath("/board");
  revalidatePath("/ledger");
  redirect("/contacts?erased=1");
}
