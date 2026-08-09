import { createClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import {
  parseContactField,
  parseFirstName,
  rateLimited,
  clientKey,
} from "@/lib/capture-guard";

// Public ten-second capture page. No auth, minimal JS, one field first.
// Contact creation goes through the public_capture() security-definer RPC —
// anonymous visitors never get table access.
//
// The guards live in @/lib/capture-guard and are deliberately invisible: this
// page's whole reason for working is that it takes ten seconds standing up at
// a table, so nothing here may add a field a real person has to think about.

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
    const consent = formData.get("consent") === "on";

    // Honeypot. A person never sees this field, so anything in it came from
    // something filling every input on the page. Show the thank-you rather
    // than an error: a bot that learns it was caught just tries again.
    // `return redirect(...)` rather than a bare call: destructured off a
    // dynamic import, TypeScript does not treat it as never-returning, so a
    // bare call leaves everything below it looking reachable.
    if (String(formData.get("website") ?? "").trim()) {
      return redirect(`/c/${slug}?done=1`);
    }

    const identity = parseContactField(String(formData.get("contact") ?? ""));
    if (!identity) return redirect(`/c/${slug}?error=1`);

    const h = await headers();
    if (
      rateLimited(
        clientKey(h.get("x-forwarded-for"), h.get("x-real-ip"), slug)
      )
    ) {
      return redirect(`/c/${slug}?error=1`);
    }

    const isEmail = identity.kind === "email";
    const anon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { error } = await anon.rpc("public_capture", {
      p_slug: slug,
      p_phone: isEmail ? null : identity.value,
      p_email: isEmail ? identity.value : null,
      p_first_name: parseFirstName(String(formData.get("first_name") ?? "")),
      p_consent_email: consent && isEmail,
      p_consent_sms: consent && !isEmail,
    });
    if (error) return redirect(`/c/${slug}?error=1`);
    return redirect(`/c/${slug}?done=1`);
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
              {/* Honeypot. Off-screen rather than display:none, which the
                  better bots skip, and hidden from assistive tech and the tab
                  order so nobody using a screen reader ever meets it. */}
              <div
                aria-hidden="true"
                className="absolute w-px h-px -left-[9999px] overflow-hidden"
              >
                <label htmlFor="website">Leave this field empty</label>
                <input
                  id="website"
                  name="website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>
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
