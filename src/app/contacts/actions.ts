"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import type { Stage } from "@/lib/stages";

// All stage moves route through the set_contact_stage() RPC so the
// append-only stage_change log can never be skipped.
export async function moveStage(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  const contactId = String(formData.get("contact_id"));
  const toStage = String(formData.get("to_stage")) as Stage;
  const reason = String(formData.get("reason") ?? "").trim() || null;

  const { error } = await supabase.rpc("set_contact_stage", {
    p_contact_id: contactId,
    p_to_stage: toStage,
    p_reason: reason,
  });
  if (error) throw error;

  // moving into the waiting room may carry a wake-up date
  const wakeUp = String(formData.get("wake_up_on") ?? "");
  if (toStage === "not_yet" && wakeUp) {
    await supabase
      .from("contact")
      .update({ wake_up_on: wakeUp })
      .eq("id", contactId);
  }

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
