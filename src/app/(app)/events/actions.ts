"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { makeSlug } from "@/lib/slug";
import type { SourceKind } from "@/lib/stages";

export async function createSource(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const kind = (formData.get("kind") as SourceKind) || "event";
  const costDollars = parseFloat(String(formData.get("cost") ?? "0")) || 0;
  const hours = parseFloat(String(formData.get("hours") ?? "0")) || 0;
  const occurredOn = String(formData.get("occurred_on") ?? "") || null;
  const location = String(formData.get("location") ?? "").trim() || null;

  const { data, error } = await supabase
    .from("source")
    .insert({
      agency_id: user.agencyId,
      kind,
      name,
      slug: makeSlug(name),
      owner_user_id: user.id,
      cost_cents: Math.round(costDollars * 100),
      hours_invested: hours,
      occurred_on: occurredOn,
      location,
    })
    .select("id")
    .single();
  if (error) throw error;
  redirect(`/events/${data.id}`);
}

// Recruiter quick-add: contact created in seconds while standing at a table.
// Goes through the quick_add_contact RPC so the contact and its stage_change
// row are written in one transaction — the app can't create a contact whose
// history is missing its first entry.
export async function quickAddContact(formData: FormData) {
  await requireUser();
  const supabase = await createClient();

  const sourceId = String(formData.get("source_id") ?? "");
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim() || null;
  const firstName = String(formData.get("first_name") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  if (!sourceId || (!phone && !email)) return;

  const consented = formData.get("consent") === "on";
  const { error } = await supabase.rpc("quick_add_contact", {
    p_source_id: sourceId,
    p_phone: phone,
    p_email: email,
    p_first_name: firstName,
    // verbal consent, gathered face to face
    p_consent_email: consented && !!email,
    p_consent_sms: consented && !!phone,
    p_notes: notes,
  });
  if (error) throw error;

  revalidatePath(`/events/${sourceId}`);
}
