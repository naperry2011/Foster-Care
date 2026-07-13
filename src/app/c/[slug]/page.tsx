import { createClient } from "@supabase/supabase-js";

// Public ten-second capture page. No auth, minimal JS, one field first.
// Contact creation goes through the public_capture() security-definer RPC —
// anonymous visitors never get table access.

export default async function CapturePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ done?: string; error?: string }>;
}) {
  const { slug } = await params;
  const { done, error } = await searchParams;

  async function capture(formData: FormData) {
    "use server";
    const { redirect } = await import("next/navigation");
    const slug = String(formData.get("slug"));
    const contactInfo = String(formData.get("contact") ?? "").trim();
    const firstName = String(formData.get("first_name") ?? "").trim();
    const consent = formData.get("consent") === "on";
    if (!contactInfo) redirect(`/c/${slug}?error=1`);

    const isEmail = contactInfo.includes("@");
    const anon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { error } = await anon.rpc("public_capture", {
      p_slug: slug,
      p_phone: isEmail ? null : contactInfo,
      p_email: isEmail ? contactInfo : null,
      p_first_name: firstName || null,
      p_consent_email: consent && isEmail,
      p_consent_sms: consent && !isEmail,
    });
    if (error) redirect(`/c/${slug}?error=1`);
    redirect(`/c/${slug}?done=1`);
  }

  return (
    <main className="min-h-screen bg-dusk flex items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        <span className="inline-block w-3 h-3 rounded-full bg-porch shadow-[0_0_24px_6px_rgba(233,162,59,.5)] mb-4" />
        {done ? (
          <>
            <h1 className="text-glow text-2xl font-semibold">
              Thank you — we&apos;ll be in touch.
            </h1>
            <p className="text-white/60 mt-3 text-sm">
              No pressure, no spam. Whenever you&apos;re ready is the right time.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-white text-2xl font-semibold">
              Curious about fostering?
            </h1>
            <p className="text-white/60 mt-2 text-sm">
              Leave a phone or email. That&apos;s it — ten seconds.
            </p>
            <form action={capture} className="mt-6 space-y-3 text-left">
              <input type="hidden" name="slug" value={slug} />
              <input
                name="contact"
                required
                autoFocus
                inputMode="email"
                placeholder="Phone or email"
                className="w-full rounded-full bg-white/10 border border-white/20 px-5 py-4 text-lg text-white placeholder-white/40 focus:outline-none focus:border-porch"
              />
              <input
                name="first_name"
                placeholder="First name (optional)"
                className="w-full rounded-full bg-white/10 border border-white/20 px-5 py-3 text-white placeholder-white/40 focus:outline-none focus:border-porch"
              />
              <label className="flex items-start gap-2 text-xs text-white/50 px-2">
                <input type="checkbox" name="consent" defaultChecked className="mt-0.5" />
                It&apos;s OK to send me occasional info about fostering. Opt out
                anytime.
              </label>
              <button
                type="submit"
                className="w-full rounded-full bg-porch text-night font-semibold py-4 text-lg hover:brightness-105"
              >
                Keep me posted
              </button>
              {error && (
                <p className="text-red-300 text-sm text-center">
                  Something went wrong — please try again.
                </p>
              )}
            </form>
          </>
        )}
      </div>
    </main>
  );
}
