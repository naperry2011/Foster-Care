import { relativeDays, type TimelineEntry } from "@/lib/timeline";

const TONE: Record<
  TimelineEntry["kind"],
  { dot: string; label: string; labelTone: string }
> = {
  touch_in: { dot: "bg-sage", label: "they replied", labelTone: "text-sage" },
  touch_out: { dot: "bg-porch", label: "we reached out", labelTone: "text-porch" },
  stage: { dot: "bg-plum-2", label: "stage", labelTone: "text-muted" },
  send: { dot: "bg-porch/60", label: "automatic", labelTone: "text-muted" },
  task: { dot: "bg-clay", label: "task", labelTone: "text-clay" },
};

export default function ContactTimeline({
  entries,
}: {
  entries: TimelineEntry[];
}) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted py-6 text-center">
        Nothing has happened yet — the record starts here.
      </p>
    );
  }

  return (
    <ol className="relative pl-6">
      {/* the thread that doesn't break when the recruiter drives home */}
      <span className="absolute left-[5px] top-2 bottom-2 w-px bg-rule" />
      {entries.map((e) => {
        const tone = TONE[e.kind];
        return (
          <li key={e.id} className="relative pb-6 last:pb-0">
            <span
              className={`absolute -left-6 top-1.5 w-2.5 h-2.5 rounded-full ring-4 ring-paper ${tone.dot}`}
            />
            <div className="flex items-baseline justify-between gap-3 flex-wrap">
              <span className="text-sm font-semibold">{e.title}</span>
              <span className="text-xs text-muted whitespace-nowrap">
                {new Date(e.at).toLocaleDateString()} · {relativeDays(e.at)}
              </span>
            </div>
            <div className={`text-[11px] uppercase tracking-wide ${tone.labelTone}`}>
              {tone.label}
              {e.meta ? ` · ${e.meta}` : ""}
            </div>
            {e.body && (
              <p className="mt-1.5 text-sm text-ink/80 whitespace-pre-wrap border-l-2 border-rule pl-3">
                {e.body}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
