"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

export async function inviteTeammate(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "recruiter");
  if (!email) return;

  const { error } = await supabase.from("agency_invite").insert({
    agency_id: user.agencyId,
    email,
    role,
    invited_by_user_id: user.id,
  });
  // A live invite for this address already exists — the partial unique index
  // says so. Re-inviting isn't an error worth a stack trace at the user.
  if (error && error.code !== "23505") throw error;

  revalidatePath("/settings/team");
}

export async function revokeInvite(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const { error } = await supabase
    .from("agency_invite")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .eq("agency_id", user.agencyId);
  if (error) throw error;

  revalidatePath("/settings/team");
}
