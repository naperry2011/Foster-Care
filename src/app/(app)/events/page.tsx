import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { SOURCE_KINDS, SOURCE_KIND_LABELS, type SourceKind } from "@/lib/stages";
import { createSource } from "./actions";

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string }>;
}) {
  const { deleted } = await searchParams;
  const supabase = await createClient();

  const { data: sources } = await supabase
    .from("source")
    .select("id, name, kind, occurred_on, location, cost_cents, contact(count)")
    .order("created_at", { ascending: false });

  return (
    <>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <PageHeader
          eyebrow="every Saturday you spend"
          title="Sources &amp; events"
          description="A church fair, a partner, an ad. Name it here and every person you meet there carries that origin forever."
        />

        {deleted && (
          <p className="mt-4 rounded-xl border border-sage/40 bg-sage-tint px-4 py-3 text-sm text-[#2F5347]">
            That source has been deleted.
          </p>
        )}

        <form
          action={createSource}
          className="mt-8 rounded-2xl border border-rule bg-white p-5 grid gap-3 sm:grid-cols-2"
        >
          <input
            name="name"
            required
            placeholder="Event or source name (e.g. Grace Community fair)"
            className="sm:col-span-2 rounded-md border border-rule px-4 py-3 focus:outline-none focus:border-porch"
          />
          <select
            name="kind"
            className="rounded-md border border-rule px-4 py-3 bg-white"
            defaultValue="event"
          >
            {SOURCE_KINDS.map((k) => (
              <option key={k} value={k}>
                {SOURCE_KIND_LABELS[k]}
              </option>
            ))}
          </select>
          <input
            name="occurred_on"
            type="date"
            className="rounded-md border border-rule px-4 py-3"
          />
          <input
            name="location"
            placeholder="Location (optional)"
            className="rounded-md border border-rule px-4 py-3"
          />
          <div className="flex gap-3">
            <input
              name="cost"
              type="number"
              step="0.01"
              min="0"
              placeholder="Cost $"
              className="w-1/2 rounded-md border border-rule px-4 py-3"
            />
            <input
              name="hours"
              type="number"
              step="0.5"
              min="0"
              placeholder="Staff hours"
              className="w-1/2 rounded-md border border-rule px-4 py-3"
            />
          </div>
          <button
            type="submit"
            className="sm:col-span-2 rounded-full bg-porch text-night font-medium py-3 hover:brightness-105"
          >
            Create &amp; get QR code
          </button>
        </form>

        <ul className="mt-8 divide-y divide-rule rounded-2xl border border-rule bg-white overflow-hidden">
          {(sources ?? []).map((s) => {
            const captured = (s.contact as unknown as { count: number }[])?.[0]?.count ?? 0;
            return (
              <li key={s.id}>
                <Link
                  href={`/events/${s.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-paper"
                >
                  <div>
                    <div className="font-medium">{s.name}</div>
                    <div className="text-sm text-muted">
                      {SOURCE_KIND_LABELS[s.kind as SourceKind]}
                      {s.occurred_on ? ` · ${s.occurred_on}` : ""}
                      {s.location ? ` · ${s.location}` : ""}
                    </div>
                  </div>
                  <div className="text-sm text-muted shrink-0">
                    <span className="font-semibold text-ink">{captured}</span> captured
                  </div>
                </Link>
              </li>
            );
          })}
          {(sources ?? []).length === 0 && (
            <li className="px-5 py-10 text-center">
              <p className="font-hand text-2xl text-ink/70">
                no sources yet
              </p>
              <p className="text-sm text-muted mt-1">
                Name the first place you&apos;ll show up. Everything else
                follows from it.
              </p>
            </li>
          )}
        </ul>
      </main>
    </>
  );
}
