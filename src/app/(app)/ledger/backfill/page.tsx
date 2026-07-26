import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Onboarding backfill: import homes the agency already licensed so the
// ledger has real outcomes on it before the product has generated any.
export default async function BackfillPage() {
  await requireUser();
  const supabase = await createClient();

  const { data: sources } = await supabase
    .from("source")
    .select("id, name")
    .order("name");

  async function backfill(formData: FormData) {
    "use server";
    const { requireUser } = await import("@/lib/auth");
    const { createClient } = await import("@/lib/supabase/server");
    const { redirect } = await import("next/navigation");
    const user = await requireUser();
    const supabase = await createClient();

    const sourceId = String(formData.get("source_id") ?? "");
    const firstName = String(formData.get("first_name") ?? "").trim() || null;
    const lastName = String(formData.get("last_name") ?? "").trim() || null;
    const email = String(formData.get("email") ?? "").trim() || null;
    const phone = String(formData.get("phone") ?? "").trim() || null;
    const capturedOn = String(formData.get("captured_on") ?? "");
    const licensedOn = String(formData.get("licensed_on") ?? "");
    if (!sourceId || (!email && !phone) || !licensedOn) return;

    const { data: contact, error } = await supabase
      .from("contact")
      .insert({
        agency_id: user.agencyId,
        source_id: sourceId,
        captured_by_user_id: user.id,
        captured_at: capturedOn
          ? new Date(capturedOn).toISOString()
          : new Date(licensedOn).toISOString(),
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        stage: "licensed",
        notes: "backfilled outcome",
      })
      .select("id")
      .single();
    if (error) throw error;

    await supabase.from("stage_change").insert({
      agency_id: user.agencyId,
      contact_id: contact.id,
      from_stage: null,
      to_stage: "licensed",
      actor_user_id: user.id,
      reason: "backfill",
    });
    await supabase.from("outcome").insert({
      agency_id: user.agencyId,
      contact_id: contact.id,
      licensed_on: licensedOn,
      confirmed_by_user_id: user.id,
      backfilled: true,
    });
    redirect("/ledger");
  }

  return (
    <>
      <main className="max-w-xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-semibold">Backfill a licensed home</h1>
        <p className="text-sm text-muted mt-1">
          Add a family you already licensed so the ledger starts with real
          outcomes. Best guess on the source is fine.
        </p>
        <form action={backfill} className="mt-6 space-y-3">
          <div className="flex gap-3">
            <input name="first_name" placeholder="First name" className="w-1/2 rounded-md border border-rule bg-white px-4 py-3" />
            <input name="last_name" placeholder="Last name" className="w-1/2 rounded-md border border-rule bg-white px-4 py-3" />
          </div>
          <input name="email" type="email" placeholder="Email" className="w-full rounded-md border border-rule bg-white px-4 py-3" />
          <input name="phone" type="tel" placeholder="or phone" className="w-full rounded-md border border-rule bg-white px-4 py-3" />
          <select name="source_id" required className="w-full rounded-md border border-rule bg-white px-4 py-3" defaultValue="">
            <option value="" disabled>
              Where did they first hear about you?
            </option>
            {(sources ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <label className="block text-sm text-muted">
            First contact (approximate)
            <input name="captured_on" type="date" className="mt-1 w-full rounded-md border border-rule bg-white px-4 py-3" />
          </label>
          <label className="block text-sm text-muted">
            Licensed on
            <input name="licensed_on" type="date" required className="mt-1 w-full rounded-md border border-rule bg-white px-4 py-3" />
          </label>
          <button className="w-full rounded-full bg-porch text-night font-medium py-3 hover:brightness-105">
            Add to ledger
          </button>
        </form>
      </main>
    </>
  );
}
