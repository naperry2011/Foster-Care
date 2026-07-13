import AppNav from "@/components/AppNav";
import StageSelect from "@/components/StageSelect";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { STAGES, STAGE_LABELS, type Stage } from "@/lib/stages";

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string }>;
}) {
  const { stage } = await searchParams;
  const user = await requireUser();
  const supabase = await createClient();

  let query = supabase
    .from("contact")
    .select(
      "id, first_name, last_name, phone, email, stage, wake_up_on, captured_at, opted_out_at, source(name)"
    )
    .order("captured_at", { ascending: false })
    .limit(500);
  if (stage && (STAGES as readonly string[]).includes(stage)) {
    query = query.eq("stage", stage);
  }
  const { data: contacts } = await query;

  return (
    <div className="flex-1">
      <AppNav agencyName={user.agencyName} />
      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl font-semibold">
            Contacts{stage ? ` — ${STAGE_LABELS[stage as Stage]}` : ""}
          </h1>
          <span className="text-sm text-muted">{contacts?.length ?? 0} shown</span>
        </div>

        <div className="mt-6 overflow-x-auto rounded-lg border border-rule bg-white">
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
                  <tr key={c.id} className="border-b border-rule/60 last:border-0 hover:bg-paper">
                    <td className="px-4 py-3">
                      <div className="font-medium">
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
                  <td colSpan={5} className="px-4 py-8 text-center text-muted">
                    No contacts yet. Capture some at an event.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
