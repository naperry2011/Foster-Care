"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

// Which counties this agency recruits in. The whole set is rewritten each save
// rather than diffed — it is at most fifteen rows and a stale checkbox is a
// worse bug than a redundant write.
export async function setCounties(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  const chosen = formData.getAll("county").map(String).filter(Boolean);

  const { error: delErr } = await supabase
    .from("agency_county")
    .delete()
    .eq("agency_id", user.agencyId);
  if (delErr) throw delErr;

  if (chosen.length) {
    const { error } = await supabase
      .from("agency_county")
      .insert(chosen.map((geo_id) => ({ agency_id: user.agencyId, geo_id })));
    if (error) throw error;
  }

  revalidatePath("/arizona");
}

export async function addTarget(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  const label = String(formData.get("label") ?? "").trim();
  const value = Number(formData.get("target_value"));
  const dueOn = String(formData.get("due_on") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (!label || !Number.isFinite(value)) return;

  const { error } = await supabase.from("agency_target").insert({
    agency_id: user.agencyId,
    label,
    target_value: value,
    unit: String(formData.get("unit") ?? "homes"),
    due_on: dueOn || null,
    note: note || null,
    created_by_user_id: user.id,
  });
  if (error) throw error;

  revalidatePath("/arizona");
}

export async function deleteTarget(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  // agency_id is redundant against RLS, and deliberately so — a policy is one
  // migration away from being loosened, a where clause is right here.
  const { error } = await supabase
    .from("agency_target")
    .delete()
    .eq("id", id)
    .eq("agency_id", user.agencyId);
  if (error) throw error;

  revalidatePath("/arizona");
}
