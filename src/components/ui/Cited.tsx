export type Citation = {
  /** who published it — "Arizona DCS", "Governor's Office via KJZZ" */
  publisher: string;
  /** the document or page title */
  title: string;
  url: string;
  /** ISO date the figure describes or was published */
  asOf: string;
  /** true when the number is a forecast, not a measurement */
  isProjection?: boolean;
};

// Every public figure on screen must be able to say where it came from.
// `source` is required by the type, so there is no way to render a cited
// number without its citation — the same trick send.ts uses for consent.
export default function Cited({
  value,
  label,
  source,
  note,
}: {
  value: React.ReactNode;
  label: string;
  source: Citation;
  note?: string;
}) {
  return (
    <div className="rounded-2xl border border-rule bg-white p-6">
      <div className="font-display text-4xl font-semibold leading-none">
        {value}
      </div>
      <div className="text-sm text-muted mt-2">{label}</div>
      {source.isProjection && (
        <div className="mt-1.5 inline-block rounded-full border border-clay/50 bg-clay-tint px-2 py-0.5 text-[11px] text-clay">
          projection, not a measurement
        </div>
      )}
      {note && <p className="text-xs text-ink/70 mt-2">{note}</p>}
      <p className="text-[11px] text-muted mt-3 pt-3 border-t border-rule leading-relaxed">
        {source.publisher} ·{" "}
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sage underline"
        >
          {source.title}
        </a>{" "}
        · as of {source.asOf}
      </p>
    </div>
  );
}
