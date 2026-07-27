import { createClient } from "@supabase/supabase-js";

// One-click unsubscribe, the human-facing half.
//
// This used to opt somebody out on GET. Corporate mail scanners (Defender Safe
// Links, Proofpoint, Mimecast) and client prefetchers fetch every URL in a
// message before a person reads it, and opt-out is irreversible by trigger, so
// a scanner could permanently remove a family from the waiting room without
// anybody clicking anything. GET now only asks; the write happens on POST.
//
// The write also no longer holds a service-role client. It goes through
// public_unsubscribe(), a security-definer RPC that can flip three columns on
// one contact and nothing else (migration 0011).

export default async function UnsubscribePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ done?: string }>;
}) {
  const { id } = await params;
  const { done } = await searchParams;

  async function confirm(formData: FormData) {
    "use server";
    const { redirect } = await import("next/navigation");
    const contactId = String(formData.get("contact_id") ?? "");

    const anon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    await anon.rpc("public_unsubscribe", { p_contact_id: contactId });

    // Always report success. Whether the id matched is not something an
    // anonymous caller should be able to probe for, and somebody who has
    // already opted out should see the same thing as somebody who just did.
    redirect(`/u/${contactId}?done=1`);
  }

  return (
    <main className="min-h-screen bg-dusk flex items-center justify-center p-6 text-center">
      <div className="max-w-sm">
        <span className="inline-block w-3 h-3 rounded-full bg-porch mb-4" />
        {done ? (
          <>
            <h1 className="text-white text-xl font-semibold">
              You&apos;re unsubscribed.
            </h1>
            <p className="text-white/60 mt-2 text-sm">
              You won&apos;t hear from us again. If you ever change your mind,
              you know where the porch light is.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-white text-xl font-semibold">
              Stop hearing from us?
            </h1>
            <p className="text-white/60 mt-2 text-sm">
              We&apos;ll stop sending you anything about fostering. This
              can&apos;t be undone, so we ask before doing it.
            </p>
            <form action={confirm} className="mt-6">
              <input type="hidden" name="contact_id" value={id} />
              <button
                type="submit"
                className="w-full rounded-full bg-porch text-night font-semibold py-3 hover:brightness-105"
              >
                Yes, unsubscribe me
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
