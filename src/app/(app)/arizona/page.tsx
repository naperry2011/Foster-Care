import PageHeader from "@/components/ui/PageHeader";
import Panel from "@/components/ui/Panel";
import Pill from "@/components/ui/Pill";
import Cited from "@/components/ui/Cited";
import SectionNote from "@/components/ui/SectionNote";
import EmptyState from "@/components/ui/EmptyState";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import {
  loadArizona,
  pick,
  fmtCount,
  fmtPct,
  fmtChange,
  humanDate,
} from "@/lib/arizona";
import { setCounties, addTarget, deleteTarget } from "./actions";

// The root layout's title template already appends " · Porchlight".
export const metadata = { title: "Arizona" };

export default async function ArizonaPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [az, { data: mine }, { data: targets }] = await Promise.all([
    loadArizona(supabase),
    supabase.from("agency_county").select("geo_id"),
    supabase
      .from("agency_target")
      .select("id, label, target_value, unit, due_on, note")
      .order("due_on", { nullsFirst: false }),
  ]);

  const chosen = new Set((mine ?? []).map((r) => r.geo_id));
  const { stats, metrics, counties } = az;

  const homesNeeded = pick(stats, "homes_needed");
  const homesChange = pick(stats, "licensed_homes_change");
  const homesNow = pick(stats, "licensed_foster_homes", "az", "SFY26 to date");
  const childrenInCare = pick(stats, "children_in_care");
  const needFamilies = pick(stats, "children_needing_families");
  const congregate = pick(stats, "pct_days_congregate_care", "az", "SFY26 to date");
  const congregateGoal = pick(stats, "pct_days_congregate_care_goal");
  const rateRise = pick(stats, "foster_rate_increase");

  const entriesMetric = metrics.get("children_entering_care");
  const entriesStatewide = pick(stats, "children_entering_care", "az");
  const myCounties = counties.filter((c) => chosen.has(c.id));

  // The two grains Arizona simply does not publish below state level. Saying
  // this out loud is the point of the band — a blank cell reads as a bug.
  const unpublished = ["children_in_care", "licensed_foster_homes"]
    .map((id) => metrics.get(id))
    .filter((m) => m?.unpublishedNote);

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <PageHeader
        eyebrow="the ground you're recruiting on"
        title="Arizona"
        description="Every number here is the state's, not ours. Each one shows its publisher, its link and the date it describes, so you can put it in front of a board."
      />

      {/* ── band 1: what the state publishes ───────────────────────── */}

      <h2 className="font-display text-2xl font-semibold mt-10">Statewide</h2>
      <SectionNote className="mt-1">
        the case for doing any of this at all
      </SectionNote>

      {stats.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            title="No Arizona figures loaded yet"
            body="Migration 0007 seeds the headline numbers. If this is empty, it hasn't been applied to this database."
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-5">
          {homesNeeded && (
            <Cited
              value={fmtCount(homesNeeded.value)}
              label="more foster homes Arizona needs, over twelve months"
              source={homesNeeded.citation}
              note={homesNeeded.note ?? undefined}
            />
          )}
          {homesChange && (
            <Cited
              value={fmtChange(homesChange.value)}
              label={`licensed foster homes than in 2017 (${homesChange.periodLabel})`}
              source={homesChange.citation}
              note={homesChange.note ?? undefined}
            />
          )}
          {homesNow && (
            <Cited
              value={fmtCount(homesNow.value)}
              label={`licensed foster homes left statewide (${homesNow.periodLabel})`}
              source={homesNow.citation}
              note={homesNow.note ?? undefined}
            />
          )}
          {childrenInCare && (
            <Cited
              value={fmtCount(childrenInCare.value)}
              label="children in out-of-home care"
              source={childrenInCare.citation}
            />
          )}
          {needFamilies && (
            <Cited
              value={`${fmtCount(needFamilies.value)}+`}
              label="children needing a foster or adoptive family"
              source={needFamilies.citation}
              note={needFamilies.note ?? undefined}
            />
          )}
          {congregate && (
            <Cited
              value={fmtPct(congregate.value)}
              label={`of care days spent in congregate care (${congregate.periodLabel})`}
              source={congregate.citation}
              note={
                congregateGoal
                  ? `The Department's own FY26 goal is a ${Math.abs(
                      congregateGoal.value * 100
                    ).toFixed(0)}-point reduction by June 2026. This is moving the other way.`
                  : undefined
              }
            />
          )}
          {rateRise && (
            <Cited
              value={fmtPct(rateRise.value, 0)}
              label="rise in the daily foster reimbursement rate"
              source={rateRise.citation}
              note={rateRise.note ?? undefined}
            />
          )}
        </div>
      )}

      {/* ── band 2: your counties ──────────────────────────────────── */}

      <h2 className="font-display text-2xl font-semibold mt-14">Your counties</h2>
      <SectionNote className="mt-1">where your families actually come from</SectionNote>

      {myCounties.length > 0 && entriesMetric && (
        <Panel className="mt-5 overflow-hidden">
          <div className="px-6 py-4 border-b border-rule">
            <h3 className="font-display text-lg font-semibold">
              {entriesMetric.label}
            </h3>
            <p className="text-sm text-muted mt-0.5">
              {entriesStatewide?.periodLabel}
              {entriesMetric.arsItem && (
                <> · A.R.S. § 8-526, {entriesMetric.arsItem}</>
              )}
            </p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted border-b border-rule">
                <th className="px-6 py-3">County</th>
                <th className="px-6 py-3 text-right">Children entering care</th>
                <th className="px-6 py-3 text-right">Share of state</th>
              </tr>
            </thead>
            <tbody>
              {myCounties.map((c) => {
                const stat = pick(stats, "children_entering_care", c.id);
                const share =
                  stat && entriesStatewide && entriesStatewide.value > 0
                    ? stat.value / entriesStatewide.value
                    : null;
                return (
                  <tr key={c.id} className="border-b border-rule/60 last:border-0">
                    <td className="px-6 py-3 font-medium">{c.name}</td>
                    <td className="px-6 py-3 text-right font-mono">
                      {stat ? fmtCount(stat.value) : "—"}
                    </td>
                    <td className="px-6 py-3 text-right font-mono text-muted">
                      {share != null ? fmtPct(share) : "—"}
                    </td>
                  </tr>
                );
              })}
              {entriesStatewide && (
                <tr className="border-t border-rule bg-paper-2/60">
                  <td className="px-6 py-3 font-medium text-muted">Arizona</td>
                  <td className="px-6 py-3 text-right font-mono text-muted">
                    {fmtCount(entriesStatewide.value)}
                  </td>
                  <td className="px-6 py-3 text-right font-mono text-muted">100%</td>
                </tr>
              )}
            </tbody>
          </table>
          {entriesStatewide && (
            <p className="text-[11px] text-muted px-6 py-3 border-t border-rule leading-relaxed">
              {entriesStatewide.citation.publisher} ·{" "}
              <a
                href={entriesStatewide.citation.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sage underline"
              >
                {entriesStatewide.citation.title}
              </a>{" "}
              ·{" "}
              {entriesStatewide.citation.asOf
                ? `as of ${entriesStatewide.citation.asOf}`
                : "undated source"}
            </p>
          )}
        </Panel>
      )}

      {myCounties.length === 0 && (
        <div className="mt-5">
          <EmptyState
            title="Tell us where you recruit"
            body="Pick your counties below and this band fills with the only sub-state numbers Arizona publishes."
            compact
          />
        </div>
      )}

      {unpublished.length > 0 && (
        <Panel tone="clay" className="mt-4 p-6">
          <p className="font-display font-semibold">
            What Arizona doesn&rsquo;t publish by county
          </p>
          <ul className="mt-2 space-y-1.5 text-sm text-ink/75">
            {unpublished.map((m) => (
              <li key={m!.id}>
                <strong>{m!.label}.</strong> {m!.unpublishedNote}
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted mt-3">
            We show the gap rather than an empty cell, because a blank reads as a
            bug and this is a fact about Arizona.
          </p>
        </Panel>
      )}

      <details className="mt-4 rounded-2xl border border-rule bg-white">
        <summary className="cursor-pointer px-6 py-4 text-sm font-medium">
          Choose your counties
          {chosen.size > 0 && (
            <span className="text-muted font-normal">
              {" "}
              · {chosen.size} selected
            </span>
          )}
        </summary>
        <form action={setCounties} className="px-6 pb-6">
          <div className="grid gap-2 sm:grid-cols-3">
            {counties.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="county"
                  value={c.id}
                  defaultChecked={chosen.has(c.id)}
                  className="rounded border-rule"
                />
                {c.name}
              </label>
            ))}
          </div>
          <button
            type="submit"
            className="mt-4 rounded-full bg-porch text-night font-semibold px-5 py-2.5 text-sm hover:brightness-105"
          >
            Save counties
          </button>
        </form>
      </details>

      {/* ── band 3: your goals ─────────────────────────────────────── */}

      <h2 className="font-display text-2xl font-semibold mt-14">Your goals</h2>
      <SectionNote className="mt-1">
        yours, not the state&rsquo;s — written in your own hand
      </SectionNote>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-5">
        {(targets ?? []).map((t) => (
          <Panel key={t.id} tone="butter" tilt="a" className="p-6">
            <div className="font-hand text-5xl text-clay leading-none">
              {fmtCount(Number(t.target_value))}
            </div>
            <div className="font-hand text-2xl text-ink/80 mt-1">
              {t.unit} — {t.label}
            </div>
            {t.due_on && (
              <div className="mt-3">
                <Pill tone="clay">by {humanDate(t.due_on)}</Pill>
              </div>
            )}
            {t.note && <p className="text-sm text-ink/70 mt-3">{t.note}</p>}
            <form action={deleteTarget} className="mt-4">
              <input type="hidden" name="id" value={t.id} />
              <button
                type="submit"
                className="text-xs text-muted underline hover:text-clay"
              >
                Remove
              </button>
            </form>
          </Panel>
        ))}
      </div>

      {(targets ?? []).length === 0 && (
        <div className="mt-5">
          <EmptyState
            title="No goals set yet"
            body="A goal is yours — it never mixes with the state's figures, and it's drawn in your handwriting so nobody can mistake it for one."
            compact
          />
        </div>
      )}

      <Panel className="mt-4 p-6">
        <h3 className="font-display text-lg font-semibold">Add a goal</h3>
        <form action={addTarget} className="grid gap-3 sm:grid-cols-4 mt-4">
          <input
            name="target_value"
            type="number"
            step="any"
            required
            placeholder="12"
            aria-label="Target"
            className="rounded-xl border border-rule px-3 py-2 text-sm"
          />
          <input
            name="unit"
            defaultValue="homes"
            aria-label="Unit"
            className="rounded-xl border border-rule px-3 py-2 text-sm"
          />
          <input
            name="label"
            required
            placeholder="licensed in Maricopa"
            aria-label="Goal"
            className="rounded-xl border border-rule px-3 py-2 text-sm sm:col-span-2"
          />
          <input
            name="due_on"
            type="date"
            aria-label="Due date"
            className="rounded-xl border border-rule px-3 py-2 text-sm"
          />
          <input
            name="note"
            placeholder="Optional — why this number"
            aria-label="Note"
            className="rounded-xl border border-rule px-3 py-2 text-sm sm:col-span-2"
          />
          <button
            type="submit"
            className="rounded-full bg-porch text-night font-semibold px-5 py-2.5 text-sm hover:brightness-105"
          >
            Add goal
          </button>
        </form>
      </Panel>

      <p className="text-xs text-muted mt-10 max-w-3xl leading-relaxed">
        Figures are loaded from Arizona DCS workbooks by hand twice a year —
        there is no API and no open-data feed. Goals belong to{" "}
        {user.agencyName}{" "}
        and are stored separately from the state&rsquo;s numbers, in a table the
        import script cannot write to.
      </p>
    </main>
  );
}
