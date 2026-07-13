import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type CurrentUser = {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  agencyId: string;
  agencyName: string;
};

// Returns the signed-in app_user + agency, or redirects.
// A signed-in auth user with no app_user row lands on /onboarding.
export async function requireUser(): Promise<CurrentUser> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("app_user")
    .select("id, full_name, role, agency_id, agency(name)")
    .eq("id", user.id)
    .single();

  if (!data) redirect("/onboarding");

  const agency = data.agency as unknown as { name: string } | null;
  return {
    id: data.id,
    email: user.email ?? "",
    fullName: data.full_name,
    role: data.role,
    agencyId: data.agency_id,
    agencyName: agency?.name ?? "",
  };
}
