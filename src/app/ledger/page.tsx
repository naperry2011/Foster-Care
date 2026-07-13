import Link from "next/link";
import AppNav from "@/components/AppNav";
import PrintButton from "@/components/PrintButton";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SOURCE_KIND_LABELS, type SourceKind } from "@/lib/stages";

const WARM_STAGES = ["curious", "considering", "not_yet"];

function median(nums: number[]): number | null {
  if (!nums.length) return null;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export default async function LedgerPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data: sources }, { data: contacts }, { data: outcomes }, { data: notYetEvents }] =
    await Promise.all([
      supabase.from("source").select("id, name, kind, cost_cents, hours_invested"),
      supabase
        .from("contact")
        .select("id, source_id, stage, captured_at, opted_out_at"),
      supabase.from("outcome").select("contact_id, licensed_on"),
      supabase.from("stage_change").select("contact_id").eq("to_stage", "not_yet"),
    ]);

  const outcomeByContact = new Map(
    (outcomes ?? []).map((o) => [o.contact_id, o.licensed_on])
  );

  const rows = (sources ?? [])
    .map((s) => {
      const mine = (contacts ?? []).filter((c) => c.source_id === s.id);
      const captured = mine.length;
      const warm = mine.filter(
        (c) => WARM_STAGES.includes(c.stage) && !c.opted_out_at
      ).length;
      const inquiries = mine.filter((c) =>
        ["inquiry", "licensed"].includes(c.stage)
      ).length;
      const licensedContacts = mine.filter((c) => outcomeByContact.has(c.id));
      const licensed = licensedContacts.length;
      const lagMonths = median(
        licensedContacts.map((c) => {
          const cap = new Date(c.captured_at).getTime();
          const lic = new Date(outcomeByContact.get(c.id)!).getTime();
          return (lic - cap) / (1000 * 60 * 60 * 24 * 30.4);
        })
      );
      const costPerHome = licensed > 0 ? s.cost_cents / 100 / licensed : null;
      const hoursPerHome =
        licensed > 0 ? Number(s.hours_invested) / licensed : null;
      return {
        id: s.id,
        name: s.name,
        kind: s.kind as SourceKind,
        cost: s.cost_cents / 100,
        hours: Number(s.hours_invested),
        captured,
        warm,
        inquiries,
        licensed,
        lagMonths,
        costPerHome,
        hoursPerHome,
      };
    })
    .sort((a, b) => b.licensed - a.licensed || b.warm - a.warm);

  // waiting-room yield: of everyone who ever entered not_yet, how many licensed?
  const everNotYet = new Set((notYetEvents ?? []).map((e) => e.contact_id));
  const notYetLicensed = [...everNotYet].filter((id) =>
    outcomeByContact.has(id)
  ).length;

  const totals = {
    captured: rows.reduce((n, r) => n + r.captured, 0),
    warm: rows.reduce((n, r) => n + r.warm, 0),
    inquiries: rows.reduce((n, r) => n + r.inquiries, 0),
    licensed: rows.reduce((n, r) => n + r.licensed, 0),
  };

  return (
    <div className="flex-1">
      <AppNav agencyName={user.agencyName} />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold">The attribution ledger</h1>
            <p className="text-sm text-muted mt-1">
              Which of the things you do produce homes — traced from first touch
              to license.
            </p>
          </div>
          <div className="flex gap-3 items-center">
            <Link
              href="/ledger/backfill"
              className="text-sm rounded-full border border-rule px-4 py-1.5 hover:bg-paper-2 print:hidden"
            >
              Backfill a past home
            </Link>
            <PrintButton />
          </div>
        </div>

        {/* leading indicators — the numbers that exist before the lag closes */}
        <div className="grid gap-4 sm:grid-cols-4 mt-6">
          {[
            { label: "Captured", value: totals.captured },
            { label: "Still warm", value: totals.warm },
            { label: "Inquiries", value: totals.inquiries },
            { label: "Licensed homes", value: totals.licensed },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-rule bg-white p-5">
              <div className="text-3xl font-semibold">{s.value}</div>
              <div className="text-sm text-muted mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="mt-6 overflow-x-auto rounded-lg border border-rule bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted border-b border-rule">
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3 text-right">Captured</th>
                <th className="px-4 py-3 text-right">Still warm</th>
                <th className="px-4 py-3 text-right">Inquiries</th>
                <th className="px-4 py-3 text-right">Licensed</th>
                <th className="px-4 py-3 text-right">Median lag</th>
                <th className="px-4 py-3 text-right">Cost / home</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-rule/60 last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium">{r.name}</div>
                    <div className="text-xs text-muted">
                      {SOURCE_KIND_LABELS[r.kind]} · ${r.cost.toFixed(0)} + {r.hours}h
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{r.captured}</td>
                  <td className="px-4 py-3 text-right font-mono">{r.warm}</td>
                  <td className="px-4 py-3 text-right font-mono">{r.inquiries}</td>
                  <td
                    className={`px-4 py-3 text-right font-mono ${
                      r.licensed > 0 ? "text-sage font-semibold" : ""
                    }`}
                  >
                    {r.licensed}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-muted">
                    {r.lagMonths != null ? `${r.lagMonths.toFixed(0)} mo` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {r.costPerHome != null
                      ? r.costPerHome === 0
                        ? `$0 + ${r.hoursPerHome?.toFixed(1)}h`
                        : `$${r.costPerHome.toFixed(0)}`
                      : "—"}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted">
                    No sources yet — the ledger fills in as you capture and license.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {everNotYet.size > 0 && (
          <div className="mt-6 rounded-lg border-l-4 border-sage bg-sage-tint p-5 text-sm">
            <strong>Waiting-room yield:</strong> {notYetLicensed} of{" "}
            {everNotYet.size} people who once said &ldquo;not yet&rdquo; went on
            to become licensed homes. Without a waiting room, all{" "}
            {everNotYet.size} would have been lost.
          </div>
        )}
      </main>
    </div>
  );
}
