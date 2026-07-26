import Link from "next/link";
import QRCode from "qrcode";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { STAGE_LABELS, type Stage } from "@/lib/stages";
import { quickAddContact } from "../actions";

export default async function EventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: source } = await supabase
    .from("source")
    .select("*")
    .eq("id", id)
    .single();
  if (!source) notFound();

  const { data: contacts } = await supabase
    .from("contact")
    .select("id, first_name, last_name, phone, email, stage, captured_at")
    .eq("source_id", id)
    .order("captured_at", { ascending: false });

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const captureUrl = `${base}/c/${source.slug}`;
  const qrDataUrl = await QRCode.toDataURL(captureUrl, {
    width: 480,
    margin: 1,
    color: { dark: "#171A2E", light: "#FFFFFF" },
  });

  return (
    <>
      <main className="max-w-5xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-semibold">{source.name}</h1>
        <p className="text-muted text-sm mt-1">
          {source.occurred_on ?? ""} {source.location ? `· ${source.location}` : ""}
        </p>

        <div className="grid gap-6 lg:grid-cols-2 mt-8">
          <div className="rounded-lg border border-rule bg-white p-6 text-center">
            <h2 className="font-semibold mb-4">Capture QR code</h2>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrDataUrl}
              alt={`QR code for ${captureUrl}`}
              className="mx-auto w-64 h-64"
            />
            <p className="mt-4 font-mono text-sm break-all">
              <a href={captureUrl} className="text-sage underline">
                {captureUrl}
              </a>
            </p>
            <p className="text-xs text-muted mt-2">
              Point people here, or screenshot the QR and print it on the table
              tent.
            </p>
          </div>

          <div className="rounded-lg border border-rule bg-white p-6">
            <h2 className="font-semibold mb-4">Quick-add (you type, they talk)</h2>
            <form action={quickAddContact} className="space-y-3">
              <input type="hidden" name="source_id" value={source.id} />
              <input
                name="phone"
                type="tel"
                placeholder="Phone"
                className="w-full rounded-md border border-rule px-4 py-4 text-lg"
              />
              <input
                name="email"
                type="email"
                placeholder="or email"
                className="w-full rounded-md border border-rule px-4 py-4 text-lg"
              />
              <input
                name="first_name"
                placeholder="First name (optional)"
                className="w-full rounded-md border border-rule px-4 py-4 text-lg"
              />
              <label className="flex items-center gap-2 text-sm text-muted">
                <input type="checkbox" name="consent" defaultChecked /> They said
                it&apos;s OK to follow up
              </label>
              <button
                type="submit"
                className="w-full rounded-full bg-porch text-night font-semibold py-4 text-lg hover:brightness-105"
              >
                Add contact
              </button>
            </form>
          </div>
        </div>

        <h2 className="font-semibold mt-10 mb-3">
          Captured here ({contacts?.length ?? 0})
        </h2>
        <ul className="divide-y divide-rule rounded-lg border border-rule bg-white">
          {(contacts ?? []).map((c) => (
            <li key={c.id} className="px-5 py-3 flex items-center justify-between gap-3">
              <div>
                <Link
                  href={`/contacts/${c.id}`}
                  className="font-medium hover:text-sage hover:underline"
                >
                  {c.first_name || c.phone || c.email}
                </Link>
                <span className="text-sm text-muted ml-2">
                  {c.phone ?? c.email ?? ""}
                </span>
              </div>
              <span className="text-xs rounded-full bg-paper-2 border border-rule px-3 py-1">
                {STAGE_LABELS[c.stage as Stage]}
              </span>
            </li>
          ))}
          {(contacts ?? []).length === 0 && (
            <li className="px-5 py-6 text-center text-muted text-sm">
              Nobody captured yet.
            </li>
          )}
        </ul>
      </main>
    </>
  );
}
