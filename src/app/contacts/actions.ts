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
