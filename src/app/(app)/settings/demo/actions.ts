"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { seedDemoAgency } from "@/lib/demo/seed";

function assertDemo(user: { isDemo: boolean }) {
  if (!user.isDemo) throw new Error("This is not a demo agency.");
}

export async function reseedDemo() {
  const user = await requireUser();
  assertDemo(user);
  const supabase = await createClient();

  const { error: clearErr } = await supabase.rpc("delete_demo_data", {
    p_agency_id: user.agencyId,
  });
  if (clearErr) throw clearErr;

  await seedDemoAgency(supabase, user.agencyId, user.id);
  revalidatePath("/", "layout");
}

export async function eraseDemo() {
  const user = await requireUser();
  assertDemo(user);
  const supabase = await createClient();

  const { error } = await supabase.rpc("delete_demo_data", {
    p_agency_id: user.agencyId,
  });
  if (error) throw error;
  revalidatePath("/", "layout");
}
