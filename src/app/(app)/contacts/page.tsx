import Link from "next/link";
import StageSelect from "@/components/StageSelect";
import ContactSearch from "@/components/ContactSearch";
import { createClient } from "@/lib/supabase/server";
import { STAGES, STAGE_LABELS, type Stage } from "@/lib/stages";

const PAGE_SIZE = 50;

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string; q?: string; page?: string; erased?: string }>;
}) {
  const { stage, q, page, erased } = await searchParams;
  const supabase = await createClient();

  const current = Math.max(1, parseInt(page ?? "1", 10) || 1);
  const from = (current - 1) * PAGE_SIZE;

  let query = supabase
    .from("contact")
    .select(
      "id, first_name, last_name, phone, email, stage, wake_up_on, captured_at, opted_out_at, source(name)",
      { count: "exact" }
    )
    .order("captured_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  if (stage && (STAGES as readonly string[]).includes(stage)) {
    query = query.eq("stage", stage);
  }
  if (q?.trim()) {
    const term = `%${q.trim()}%`;
    query = query.or(
      `first_name.ilike.${term},last_name.ilike.${term},email.ilike.${term},phone.ilike.${term}`
    );
  }
  const { data: contacts, count } = await query;

  const total = count ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageHref = (n: number) => {
    const p = new URLSearchParams();
    if (stage) p.set("stage", stage);
    if (q) p.set("q", q);
    if (n > 1) p.set("page", String(n));
    const qs = p.toString();
    return qs ? `/contacts?${qs}` : "/contacts";
  };

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="font-hand text-2xl text-clay">everyone you&apos;ve met</p>
          <h1 className="font-display text-3xl font-semibold mt-1">
            Contacts{stage ? ` — ${STAGE_LABELS[stage as Stage]}` : ""}
          </h1>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <ContactSearch initial={q ?? ""} />
          <Link
            href="/contacts/new"
            className="shrink-0 rounded-full bg-porch text-night font-semibold px-5 py-2.5 text-sm hover:brightness-105"
          >
            Add contact
          </Link>
        </div>
      </div>

      {erased && (
        <p className="mt-4 rounded-xl border border-sage/40 bg-sage-tint px-4 py-3 text-sm text-[#2F5347]">
          That person has been erased, along with everything we held about them.
        </p>
      )}

      <div className="mt-3 text-sm text-muted">
        {total} {total === 1 ? "contact" : "contacts"}
        {q ? ` matching “${q}”` : ""}
        {total > PAGE_SIZE ? ` · page ${current} of ${lastPage}` : ""}
      </div>

      {/* Below md a five-column table means sideways scrolling on a phone, so
          each contact becomes a card instead. Same data, same links. */}
      <ul className="mt-4 md:hidden space-y-3">
        {(contacts ?? []).map((c) => {
          const src = c.source as unknown as { name: string } | null;
          return (
            <li
              key={c.id}
              className="rounded-2xl border border-rule bg-white p-4"
            >
              <Link href={`/contacts/${c.id}`} className="block">
                <div className="font-medium">
                  {[c.first_name, c.last_name].filter(Boolean).join(" ") ||
                    c.phone ||
                    c.email}
                  {c.opted_out_at && (
                    <span className="ml-2 text-xs text-clay">opted out</span>
                  )}
                </div>
                <div className="text-muted text-xs mt-0.5 break-words">
                  {[c.phone, c.email].filter(Boolean).join(" · ")}
                </div>
              </Link>
              <div className="mt-2 text-xs text-muted flex flex-wrap gap-x-3 gap-y-1">
                {src?.name && <span>{src.name}</span>}
                {c.wake_up_on && <span>wakes {c.wake_up_on}</span>}
                <span>{new Date(c.captured_at).toLocaleDateString()}</span>
              </div>
              <div className="mt-3">
                <StageSelect contactId={c.id} stage={c.stage as Stage} />
              </div>
            </li>
          );
        })}
        {(contacts ?? []).length === 0 && (
          <li className="rounded-2xl border border-rule bg-white px-4 py-10 text-center">
            <p className="font-display text-lg">
              {q ? "Nobody by that name." : "No contacts yet."}
            </p>
            <p className="text-sm text-muted mt-1">
              {q
                ? "Try part of a phone number or email instead."
                : "The next person who stops at your table doesn't have to be a memory."}
            </p>
            {!q && (
              <Link
                href="/contacts/new"
                className="inline-block mt-4 rounded-full bg-porch text-night font-semibold px-5 py-2.5 text-sm"
              >
                Add a contact
              </Link>
            )}
          </li>
        )}
      </ul>

      <div className="mt-4 hidden md:block overflow-x-auto rounded-2xl border border-rule bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-muted border-b border-rule">
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Stage</th>
              <th className="px-4 py-3">Wake-up</th>
              <th className="px-4 py-3">Captured</th>
            </tr>
          </thead>
          <tbody>
            {(contacts ?? []).map((c) => {
              const src = c.source as unknown as { name: string } | null;
              return (
                <tr
                  key={c.id}
                  className="border-b border-rule/60 last:border-0 hover:bg-paper"
                >
                  <td className="px-4 py-3">
                    <Link href={`/contacts/${c.id}`} className="block group">
                      <div className="font-medium group-hover:text-sage group-hover:underline">
                        {[c.first_name, c.last_name].filter(Boolean).join(" ") ||
                          c.phone ||
                          c.email}
                        {c.opted_out_at && (
                          <span className="ml-2 text-xs text-clay">opted out</span>
                        )}
                      </div>
                      <div className="text-muted text-xs">
                        {[c.phone, c.email].filter(Boolean).join(" · ")}
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted">{src?.name}</td>
                  <td className="px-4 py-3">
                    <StageSelect contactId={c.id} stage={c.stage as Stage} />
                  </td>
                  <td className="px-4 py-3 text-muted">{c.wake_up_on ?? "—"}</td>
                  <td className="px-4 py-3 text-muted">
                    {new Date(c.captured_at).toLocaleDateString()}
                  </td>
                </tr>
              );
            })}
            {(contacts ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center">
                  <p className="font-display text-lg">
                    {q ? "Nobody by that name." : "No contacts yet."}
                  </p>
                  <p className="text-sm text-muted mt-1">
                    {q
                      ? "Try part of a phone number or email instead."
                      : "The next person who stops at your table doesn't have to be a memory."}
                  </p>
                  {!q && (
                    <div className="mt-4 flex flex-wrap justify-center gap-3">
                      <Link
                        href="/contacts/new"
                        className="rounded-full bg-porch text-night font-semibold px-5 py-2.5 text-sm hover:brightness-105"
                      >
                        Add a contact
                      </Link>
                      <Link
                        href="/events"
                        className="rounded-full border border-rule px-5 py-2.5 text-sm hover:bg-paper-2"
                      >
                        Set up an event
                      </Link>
                    </div>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {lastPage > 1 && (
        <div className="mt-5 flex items-center justify-between text-sm">
          {current > 1 ? (
            <Link href={pageHref(current - 1)} className="text-sage hover:underline">
              ← Newer
            </Link>
          ) : (
            <span />
          )}
          {current < lastPage ? (
            <Link href={pageHref(current + 1)} className="text-sage hover:underline">
              Older →
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}
    </main>
  );
}
