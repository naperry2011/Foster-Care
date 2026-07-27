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

// Deleting a source is deliberately narrow. The ledger's denominators are the
// whole argument of this product, so a source that has ever captured somebody
// stays forever — even after those contacts are erased, because delete_contact()
// keeps the source and its cost on purpose (ADR-007). What this removes is the
// mistyped event and the one created while trying the product out.
//
// The refusal is enforced by the database, not here: contact.source_id has no
// ON DELETE clause, so Postgres raises 23503 if any contact still points at it.
// This function turns that into a sentence a recruiter can act on.
export async function deleteSource(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  const id = String(formData.get("source_id") ?? "");
  if (!id) return;

  // .select() so a delete that matched nothing (wrong id, other agency, RLS)
  // reports "not found" instead of claiming success.
  const { data, error } = await supabase
    .from("source")
    .delete()
    .eq("id", id)
    .eq("agency_id", user.agencyId)
    .select("id");

  if (error) {
    if (error.code === "23503") {
      redirect(`/events/${id}?error=has_contacts`);
    }
    throw error;
  }
  if (!data?.length) {
    redirect(`/events/${id}?error=not_found`);
  }

  revalidatePath("/events");
  revalidatePath("/ledger");
  redirect("/events?deleted=1");
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
