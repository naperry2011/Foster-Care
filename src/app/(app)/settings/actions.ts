"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

export async function updateAgency(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  const name = String(formData.get("agency_name") ?? "").trim();
  const fullName = String(formData.get("full_name") ?? "").trim();

  if (name) {
    const { error } = await supabase
      .from("agency")
      .update({ name })
      .eq("id", user.agencyId);
    if (error) throw error;
  }
  const { error: uErr } = await supabase
    .from("app_user")
    .update({ full_name: fullName || null })
    .eq("id", user.id);
  if (uErr) throw uErr;

  revalidatePath("/settings");
  revalidatePath("/", "layout");
}
