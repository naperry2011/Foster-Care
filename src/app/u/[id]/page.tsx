import { createAdminClient } from "@/lib/admin";

// One-click unsubscribe. The contact id is an unguessable UUID; opting out
// is irreversible by design (enforced by a DB trigger as well).
export default async function UnsubscribePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: contact } = await admin
    .from("contact")
    .select("id, opted_out_at")
    .eq("id", id)
    .maybeSingle();

  let ok = false;
  if (contact) {
    if (contact.opted_out_at) {
      ok = true;
    } else {
      const { error } = await admin
        .from("contact")
        .update({
          opted_out_at: new Date().toISOString(),
          consent_email: false,
          consent_sms: false,
        })
        .eq("id", id);
      ok = !error;
    }
  }

  return (
    <main className="min-h-screen bg-dusk flex items-center justify-center p-6 text-center">
      <div>
        <span className="inline-block w-3 h-3 rounded-full bg-porch mb-4" />
        <h1 className="text-white text-xl font-semibold">
          {ok ? "You're unsubscribed." : "Link not recognized."}
        </h1>
        <p className="text-white/60 mt-2 text-sm max-w-xs">
          {ok
            ? "You won't hear from us again. If you ever change your mind, you know where the porch light is."
            : "This unsubscribe link doesn't match any record."}
        </p>
      </div>
    </main>
  );
}
