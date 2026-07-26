import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// First sign-in with no app_user row: create an agency and join it.
// Anyone joining an existing agency comes through /join/[token] instead.
export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: existing } = await supabase
    .from("app_user")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (existing) redirect("/");

  async function createAgency(formData: FormData) {
    "use server";
    const { createClient: createServer } = await import("@/lib/supabase/server");

    const supabase = await createServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const agencyName = String(formData.get("agency") ?? "").trim();
    const fullName = String(formData.get("name") ?? "").trim();
    if (!agencyName) return;

    // Creating an agency crosses the RLS boundary — there is no agency to be
    // scoped to yet — so it goes through a security-definer RPC that will only
    // ever do it for a signed-in caller who has no agency. This used to be a
    // service-role client built inside a request handler, which meant app code
    // holding a key that could read every tenant. See migration 0009.
    const { error } = await supabase.rpc("create_agency", {
      p_name: agencyName,
      p_full_name: fullName || null,
    });
    if (error) throw error;
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-dusk flex items-center justify-center p-6">
      <form action={createAgency} className="w-full max-w-sm space-y-4">
        <h1 className="text-white text-xl font-semibold text-center">
          Set up your agency
        </h1>
        <input
          name="name"
          placeholder="Your name"
          className="w-full rounded-full bg-white/10 border border-white/20 px-5 py-3 text-white placeholder-white/40 focus:outline-none focus:border-porch"
        />
        <input
          name="agency"
          required
          placeholder="Agency name"
          className="w-full rounded-full bg-white/10 border border-white/20 px-5 py-3 text-white placeholder-white/40 focus:outline-none focus:border-porch"
        />
        <button
          type="submit"
          className="w-full rounded-full bg-porch text-night font-medium py-3 hover:brightness-105"
        >
          Create agency
        </button>
      </form>
    </main>
  );
}
