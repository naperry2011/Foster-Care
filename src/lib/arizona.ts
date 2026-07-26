import type { SupabaseClient } from "@supabase/supabase-js";
import type { Citation } from "@/components/ui/Cited";

// Reading side of migration 0007. Every figure that leaves this module carries
// its citation, because /arizona's whole credibility rests on a recruitment
// director being able to repeat a number to a board and say where it came
// from. See ADR-011.

export type AzGeoLevel = "state" | "region" | "county";

export type AzStat = {
  metricId: string;
  geoId: string;
  value: number;
  periodLabel: string;
  note: string | null;
  citation: Citation;
};

export type AzMetric = {
  id: string;
  label: string;
  unit: string;
  publishedLevels: AzGeoLevel[];
  arsItem: string | null;
  unpublishedNote: string | null;
};

export type AzCounty = { id: string; name: string };

type StatRow = {
  metric_id: string;
  geo_id: string;
  value: number | string;
  period_label: string;
  as_of: string | null;
  is_projection: boolean;
  note: string | null;
  az_stat_source: {
    publisher: string;
    title: string;
    url: string;
  } | null;
};

// "2025-12-31" -> "Dec 31, 2025". Built from the parts rather than Date, which
// would shift the day backwards for anyone west of UTC.
export function humanDate(iso: string | null): string | null {
  if (!iso) return null;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${months[m - 1]} ${d}, ${y}`;
}

function toStat(row: StatRow): AzStat | null {
  const src = row.az_stat_source;
  // No source row means no citation, and an uncitable figure does not render.
  if (!src) return null;
  return {
    metricId: row.metric_id,
    geoId: row.geo_id,
    value: Number(row.value),
    periodLabel: row.period_label,
    note: row.note,
    citation: {
      publisher: src.publisher,
      title: src.title,
      url: src.url,
      asOf: humanDate(row.as_of),
      isProjection: row.is_projection,
    },
  };
}

export type AzData = {
  stats: AzStat[];
  metrics: Map<string, AzMetric>;
  counties: AzCounty[];
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function loadArizona(supabase: SupabaseClient<any>): Promise<AzData> {
  const [{ data: stats }, { data: metrics }, { data: counties }] = await Promise.all([
    supabase
      .from("az_stat")
      .select(
        "metric_id, geo_id, value, period_label, as_of, is_projection, note, az_stat_source(publisher, title, url)"
      ),
    supabase
      .from("az_metric")
      .select("id, label, unit, published_levels, ars_item, unpublished_note, sort_order")
      .order("sort_order"),
    supabase.from("az_geo").select("id, name").eq("level", "county").order("name"),
  ]);

  return {
    stats: ((stats ?? []) as unknown as StatRow[])
      .map(toStat)
      .filter((s): s is AzStat => s !== null),
    metrics: new Map(
      (metrics ?? []).map((m) => [
        m.id,
        {
          id: m.id,
          label: m.label,
          unit: m.unit,
          publishedLevels: (m.published_levels ?? []) as AzGeoLevel[],
          arsItem: m.ars_item,
          unpublishedNote: m.unpublished_note,
        },
      ])
    ),
    counties: (counties ?? []) as AzCounty[],
  };
}

/** The single figure for a metric in a place, newest period first. */
export function pick(
  stats: AzStat[],
  metricId: string,
  geoId = "az",
  periodLabel?: string
): AzStat | null {
  const matches = stats.filter(
    (s) =>
      s.metricId === metricId &&
      s.geoId === geoId &&
      (periodLabel === undefined || s.periodLabel === periodLabel)
  );
  if (!matches.length) return null;
  // Undated figures sort last: a dated number is always the better answer.
  return matches.sort((a, b) => (b.citation.asOf ?? "").localeCompare(a.citation.asOf ?? ""))[0];
}

export const fmtCount = (n: number) => n.toLocaleString("en-US");

/** 0.1719 -> "17.2%". Percentages arrive from DCS as fractions. */
export const fmtPct = (n: number, digits = 1) =>
  `${(n * 100).toFixed(digits)}%`;

/** -0.62 -> "62% fewer"; 0.5 -> "50% more". */
export const fmtChange = (n: number) =>
  `${Math.abs(n * 100).toFixed(0)}% ${n < 0 ? "fewer" : "more"}`;
