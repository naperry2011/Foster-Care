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
export async function quickAddContact(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  const sourceId = String(formData.get("source_id") ?? "");
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim() || null;
  const firstName = String(formData.get("first_name") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  if (!sourceId || (!phone && !email)) return;

  const { data: contact, error } = await supabase
    .from("contact")
    .insert({
      agency_id: user.agencyId,
      source_id: sourceId,
      captured_by_user_id: user.id,
      phone,
      email,
      first_name: firstName,
      notes,
      stage: "curious",
      // verbal consent gathered in person
      consent_sms: formData.get("consent") === "on" && !!phone,
      consent_email: formData.get("consent") === "on" && !!email,
    })
    .select("id")
    .single();
  if (error) throw error;

  await supabase.from("stage_change").insert({
    agency_id: user.agencyId,
    contact_id: contact.id,
    from_stage: null,
    to_stage: "curious",
    actor_user_id: user.id,
    reason: "recruiter quick-add",
  });

  revalidatePath(`/events/${sourceId}`);
}
