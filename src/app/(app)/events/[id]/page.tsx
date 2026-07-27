import Link from "next/link";
import QRCode from "qrcode";
import { notFound } from "next/navigation";
import DeleteSource from "@/components/DeleteSource";
import { createClient } from "@/lib/supabase/server";
import { STAGE_LABELS, type Stage } from "@/lib/stages";
import { quickAddContact } from "../actions";

export default async function EventPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
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
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <Link href="/events" className="text-sm text-sage hover:underline">
          ← All sources
        </Link>
        <h1 className="font-display text-3xl font-semibold mt-3">
          {source.name}
        </h1>
        <p className="text-muted text-sm mt-1">
          {source.occurred_on ?? ""} {source.location ? `· ${source.location}` : ""}
        </p>

        {error && (
          <p className="mt-4 rounded-xl border border-clay/40 bg-clay-tint px-4 py-3 text-sm">
            {error === "has_contacts"
              ? "This source can't be deleted: people were captured here, and their attribution is part of your ledger."
              : "That source could not be found."}
          </p>
        )}

        <div className="grid gap-6 lg:grid-cols-2 mt-8">
          <div className="rounded-2xl border border-rule bg-white p-6 text-center">
            <h2 className="font-display text-lg font-semibold mb-4">Capture QR code</h2>
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

          <div className="rounded-2xl border border-rule bg-white p-6">
            <h2 className="font-display text-lg font-semibold mb-4">Quick-add (you type, they talk)</h2>
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

        <h2 className="font-display text-xl font-semibold mt-10 mb-3">
          Captured here ({contacts?.length ?? 0})
        </h2>
        <ul className="divide-y divide-rule rounded-2xl border border-rule bg-white overflow-hidden">
          {(contacts ?? []).map((c) => (
            <li key={c.id} className="px-5 py-3 flex items-center justify-between gap-3">
              {/* min-w-0 so a long email can shrink. Without it the flex item
                  keeps its intrinsic width and shoves the stage pill past the
                  right edge, where the list's overflow-hidden clips it. */}
              <div className="min-w-0">
                <Link
                  href={`/contacts/${c.id}`}
                  className="font-medium hover:text-sage hover:underline block truncate"
                >
                  {c.first_name || c.phone || c.email}
                </Link>
                <span className="text-sm text-muted block truncate">
                  {c.phone ?? c.email ?? ""}
                </span>
              </div>
              <span className="text-xs rounded-full bg-paper-2 border border-rule px-3 py-1 shrink-0">
                {STAGE_LABELS[c.stage as Stage]}
              </span>
            </li>
          ))}
          {(contacts ?? []).length === 0 && (
            <li className="px-5 py-8 text-center">
              <p className="font-hand text-xl text-ink/70">nobody captured yet</p>
              <p className="text-xs text-muted mt-1">Scan the code with your own phone to try it.</p>
            </li>
          )}
        </ul>

        <div className="mt-10 rounded-2xl border border-clay/40 bg-clay-tint/50 p-5">
          <h3 className="font-display font-semibold">Delete this source</h3>
          <p className="text-sm text-ink/70 mt-1 mb-3">
            For a typo or a source you created while trying things out. Once
            somebody has been captured here, it stays, because your cost per
            licensed home is measured against it.
          </p>
          <DeleteSource
            sourceId={source.id}
            name={source.name}
            captured={contacts?.length ?? 0}
          />
        </div>
      </main>
    </>
  );
}
