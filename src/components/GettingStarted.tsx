import Link from "next/link";
import Panel from "@/components/ui/Panel";

// A checklist that ticks itself off what the database already knows, and
// disappears entirely once it's finished. Nothing here is stored — a
// "dismissed" flag would just be one more thing to get out of step with
// reality, and an agency that undoes a step should get the nudge back.
export type Step = {
  label: string;
  done: boolean;
  href: string;
  hint: string;
};

export default function GettingStarted({ steps }: { steps: Step[] }) {
  const done = steps.filter((s) => s.done).length;
  if (done === steps.length) return null;

  const next = steps.find((s) => !s.done);

  return (
    <Panel tone="butter" tilt="b" className="mt-8 p-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="font-hand text-2xl text-clay">first things first</p>
          <h2 className="font-display text-xl font-semibold mt-0.5">
            Getting set up
          </h2>
        </div>
        <span className="text-sm text-muted">
          {done} of {steps.length}
        </span>
      </div>

      <ul className="mt-4 space-y-2">
        {steps.map((s) => (
          <li key={s.label}>
            <Link
              href={s.href}
              className={`flex items-start gap-3 rounded-xl border p-3 transition-colors ${
                s.done
                  ? "border-sage/30 bg-sage-tint/60"
                  : "border-rule bg-white hover:border-porch"
              }`}
            >
              <span
                className={`mt-0.5 w-5 h-5 shrink-0 rounded-md border flex items-center justify-center text-xs ${
                  s.done ? "border-sage bg-sage text-white" : "border-rule"
                }`}
              >
                {s.done ? "✓" : ""}
              </span>
              <span className="min-w-0">
                <span
                  className={`block text-sm font-medium ${
                    s.done ? "text-sage" : ""
                  }`}
                >
                  {s.label}
                </span>
                {!s.done && (
                  <span className="block text-xs text-muted mt-0.5">
                    {s.hint}
                  </span>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {next && (
        <p className="font-hand text-xl text-ink/70 mt-4">
          next: {next.label.toLowerCase()}
        </p>
      )}
    </Panel>
  );
}
