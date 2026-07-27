import Link from "next/link";
import PrintButton from "@/components/PrintButton";
import PageHeader from "@/components/ui/PageHeader";
import StatTile from "@/components/ui/StatTile";
import { createClient } from "@/lib/supabase/server";
import { SOURCE_KIND_LABELS, type SourceKind } from "@/lib/stages";

// The aggregation lives in Postgres (migration 0012). It used to read every
// source, contact, outcome and stage_change into memory and count them here,
// which hit Supabase's 1000-row cap silently and scanned contacts once per
// source. Both are gone; this file now only formats.
type LedgerRow = {
  source_id: string;
  name: string;
  kind: SourceKind;
  cost_cents: number;
  hours_invested: number | string;
  captured: number;
  warm: number;
  inquiries: number;
  licensed: number;
  lag_months: number | string | null;
};

export default async function LedgerPage() {
  const supabase = await createClient();

  const [{ data: ledgerRows }, { data: waiting }] = await Promise.all([
    supabase.rpc("ledger_rows"),
    supabase.rpc("ledger_waiting_room"),
  ]);

  const rows = ((ledgerRows ?? []) as LedgerRow[]).map((r) => {
    const licensed = Number(r.licensed);
    const cost = r.cost_cents / 100;
    const hours = Number(r.hours_invested);
    return {
      id: r.source_id,
      name: r.name,
      kind: r.kind,
      cost,
      hours,
      captured: Number(r.captured),
      warm: Number(r.warm),
      inquiries: Number(r.inquiries),
      licensed,
      lagMonths: r.lag_months == null ? null : Number(r.lag_months),
      costPerHome: licensed > 0 ? cost / licensed : null,
      hoursPerHome: licensed > 0 ? hours / licensed : null,
    };
  });

  // waiting-room yield: of everyone who ever entered not_yet, how many licensed?
  const wr = (waiting ?? [])[0] as
    | { ever_not_yet: number | string; not_yet_licensed: number | string }
    | undefined;
  const everNotYetCount = Number(wr?.ever_not_yet ?? 0);
  const notYetLicensed = Number(wr?.not_yet_licensed ?? 0);

  const totals = {
    captured: rows.reduce((n, r) => n + r.captured, 0),
    warm: rows.reduce((n, r) => n + r.warm, 0),
    inquiries: rows.reduce((n, r) => n + r.inquiries, 0),
    licensed: rows.reduce((n, r) => n + r.licensed, 0),
  };

  return (
    <>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <PageHeader
          eyebrow="which Saturdays became homes"
          title="The attribution ledger"
          description="Everything else in Porchlight is plumbing for this page. It answers the one question your funding depends on."
          actions={
            <>
              <Link
                href="/ledger/backfill"
                className="text-sm rounded-full border border-rule px-4 py-2 hover:bg-paper-2 print:hidden"
              >
                Backfill a past home
              </Link>
              <PrintButton />
            </>
          }
        />

        {/* leading indicators — the numbers that exist before the lag closes */}
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-4 mt-8">
          <StatTile value={totals.captured} label="Captured" />
          <StatTile value={totals.warm} label="Still warm" tone="porch" />
          <StatTile value={totals.inquiries} label="Inquiries" />
          <StatTile
            value={totals.licensed}
            label="Licensed homes"
            tone="sage"
            footnote="the only number you're paid on"
          />
        </div>

        {/* Seven columns will not sit on a phone. Each source becomes a card
            below md, with the two numbers that carry the argument up top. */}
        <ul className="mt-6 md:hidden space-y-3 print:hidden">
          {rows.map((r) => (
            <li
              key={r.id}
              className="rounded-2xl border border-rule bg-white p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium">{r.name}</div>
                  <div className="text-xs text-muted mt-0.5">
                    {SOURCE_KIND_LABELS[r.kind]} · ${r.cost.toFixed(0)} +{" "}
                    {r.hours}h
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div
                    className={`font-mono text-lg ${
                      r.licensed > 0 ? "text-sage font-semibold" : "text-muted"
                    }`}
                  >
                    {r.licensed}
                  </div>
                  <div className="text-[11px] uppercase tracking-wide text-muted">
                    licensed
                  </div>
                </div>
              </div>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                {[
                  ["Captured", String(r.captured)],
                  ["Warm", String(r.warm)],
                  ["Inquiries", String(r.inquiries)],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg bg-paper-2 py-2">
                    <dd className="font-mono text-sm">{value}</dd>
                    <dt className="text-[11px] text-muted">{label}</dt>
                  </div>
                ))}
              </dl>
              <div className="mt-2 flex justify-between text-xs text-muted">
                <span>
                  Median lag {r.lagMonths != null ? `${r.lagMonths.toFixed(0)} mo` : "—"}
                </span>
                <span>
                  Cost / home{" "}
                  {r.costPerHome != null
                    ? r.costPerHome === 0
                      ? `$0 + ${r.hoursPerHome?.toFixed(1)}h`
                      : `$${r.costPerHome.toFixed(0)}`
                    : "—"}
                </span>
              </div>
            </li>
          ))}
          {rows.length === 0 && (
            <li className="rounded-2xl border border-rule bg-white px-4 py-10 text-center">
              <p className="font-hand text-2xl text-ink/70">
                the ledger is still empty
              </p>
              <p className="text-sm text-muted mt-1">
                It fills in as you capture people and confirm the homes they
                become.
              </p>
              <Link
                href="/ledger/backfill"
                className="inline-block mt-4 rounded-full bg-porch text-night font-semibold px-5 py-2.5 text-sm"
              >
                Backfill a home you licensed
              </Link>
            </li>
          )}
        </ul>

        <div className="mt-6 hidden md:block print:block overflow-x-auto rounded-2xl border border-rule bg-white">
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
                  <td colSpan={7} className="px-4 py-10 text-center">
                    <p className="font-hand text-2xl text-ink/70">
                      the ledger is still empty
                    </p>
                    <p className="text-sm text-muted mt-1">
                      It fills in as you capture people and confirm the homes
                      they become. You can start it with history you already
                      have.
                    </p>
                    <Link
                      href="/ledger/backfill"
                      className="inline-block mt-4 rounded-full bg-porch text-night font-semibold px-5 py-2.5 text-sm hover:brightness-105"
                    >
                      Backfill a home you licensed
                    </Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {everNotYetCount > 0 && (
          <div className="mt-6 rounded-2xl border-l-4 border-sage bg-sage-tint p-6">
            <p className="font-display text-xl font-semibold text-[#2F5347]">
              {notYetLicensed > 0 ? (
                <>
                  {notYetLicensed} of your {totals.licensed} licensed{" "}
                  {totals.licensed === 1 ? "home" : "homes"}{" "}
                  came from people who had already said &ldquo;not yet.&rdquo;
                </>
              ) : (
                <>
                  {everNotYetCount}{" "}
                  {everNotYetCount === 1 ? "person is" : "people are"}{" "}
                  being held warm right now.
                </>
              )}
            </p>
            <p className="text-sm text-[#2F5347]/80 mt-2">
              {notYetLicensed > 0 ? (
                <>
                  Without a waiting room, every one of them would have been
                  lost. {everNotYetCount} people have been held so far, and{" "}
                  {Math.round((notYetLicensed / everNotYetCount) * 100)}% of
                  them have become homes.
                </>
              ) : (
                <>
                  Nobody has come back around yet — that takes a year or two.
                  This is the number no other tool in this market can produce.
                </>
              )}
            </p>
          </div>
        )}
      </main>
    </>
  );
}
