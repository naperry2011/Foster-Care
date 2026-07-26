import Pill from "@/components/ui/Pill";
import {
  startJourney,
  toggleJourneyStep,
  moveStage,
} from "@/app/(app)/contacts/actions";
import type { Stage } from "@/lib/stages";

// "Onboarding progress", never "licensing". Porchlight records whether a
// family has cleared a requirement; Arizona decides whether they are licensed.
// No documents, no signatures, nothing about a child. See migration 0008.

export type JourneyStep = {
  id: string;
  requirement_code: string;
  step_no: number;
  label: string;
  category: string;
  completed_on: string | null;
};

export type Journey = {
  id: string;
  started_on: string;
  completed_on: string | null;
};

const CATEGORY_LABELS: Record<string, string> = {
  eligibility: "Before anything else",
  background: "Background checks",
  training: "Training",
  health: "Health",
  home: "Your home",
};

const CATEGORY_ORDER = ["eligibility", "background", "training", "health", "home"];

export default function JourneyPanel({
  contactId,
  stage,
  journey,
  steps,
  details,
}: {
  contactId: string;
  stage: Stage;
  journey: Journey | null;
  steps: JourneyStep[];
  /** guidance text, read live from the catalog rather than snapshotted */
  details: Map<string, string>;
}) {
  if (!journey) {
    return (
      <section className="mt-6 rounded-2xl border-2 border-dashed border-rule bg-butter/60 p-6 text-center">
        <h2 className="font-display text-xl font-semibold">
          Start onboarding progress
        </h2>
        <p className="text-sm text-ink/70 mt-1.5 max-w-lg mx-auto">
          A checklist of what Arizona asks of a new foster family, so you can
          answer &ldquo;where are we up to?&rdquo; without ringing anyone. It
          tracks whether a step is done — nothing else.
        </p>
        <form action={startJourney} className="mt-4">
          <input type="hidden" name="contact_id" value={contactId} />
          <button className="rounded-full bg-porch text-night font-semibold px-6 py-2.5 text-sm hover:brightness-105">
            Start the checklist
          </button>
        </form>
      </section>
    );
  }

  const done = steps.filter((s) => s.completed_on).length;
  const total = steps.length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  const byCategory = CATEGORY_ORDER.map((cat) => ({
    cat,
    items: steps
      .filter((s) => s.category === cat)
      .sort((a, b) => a.step_no - b.step_no),
  })).filter((g) => g.items.length);

  return (
    <section className="mt-6 rounded-2xl border border-rule bg-white p-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-display text-xl font-semibold">
            Onboarding progress
          </h2>
          <p className="text-sm text-muted mt-0.5">
            Started {journey.started_on}. Arizona&rsquo;s requirements, as your
            agency runs them.
          </p>
        </div>
        <Pill tone={done === total ? "sage" : "porch"}>
          {done} of {total} done
        </Pill>
      </div>

      <div className="mt-4 h-2 rounded-full bg-paper-2 overflow-hidden">
        <div
          className="h-full bg-porch transition-[width]"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-6 space-y-6">
        {byCategory.map((group) => (
          <div key={group.cat}>
            <h3 className="text-xs uppercase tracking-wide text-muted">
              {CATEGORY_LABELS[group.cat] ?? group.cat}
            </h3>
            <ul className="mt-2 space-y-2">
              {group.items.map((s) => {
                const isDone = Boolean(s.completed_on);
                return (
                  <li
                    key={s.id}
                    className={`rounded-xl border p-3 flex items-start gap-3 ${
                      isDone
                        ? "border-sage/30 bg-sage-tint"
                        : "border-rule bg-white"
                    }`}
                  >
                    <form action={toggleJourneyStep} className="shrink-0 pt-0.5">
                      <input type="hidden" name="step_id" value={s.id} />
                      <input type="hidden" name="contact_id" value={contactId} />
                      <input type="hidden" name="done" value={isDone ? "0" : "1"} />
                      <button
                        aria-label={
                          isDone
                            ? `Mark "${s.label}" not done`
                            : `Mark "${s.label}" done`
                        }
                        className={`w-5 h-5 rounded-md border flex items-center justify-center text-xs ${
                          isDone
                            ? "border-sage bg-sage text-white"
                            : "border-rule bg-white hover:border-porch"
                        }`}
                      >
                        {isDone ? "✓" : ""}
                      </button>
                    </form>
                    <div className="min-w-0">
                      <div
                        className={`text-sm font-medium ${
                          isDone ? "text-sage" : ""
                        }`}
                      >
                        {s.label}
                      </div>
                      {details.get(s.requirement_code) && (
                        <p className="text-xs text-muted mt-0.5 leading-relaxed">
                          {details.get(s.requirement_code)}
                        </p>
                      )}
                      {s.completed_on && (
                        <p className="text-xs text-sage/80 mt-1">
                          done {s.completed_on}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {journey.completed_on && stage !== "licensed" && (
        <div className="mt-6 rounded-xl border-l-4 border-sage bg-sage-tint p-4">
          <p className="font-display font-semibold text-[#2F5347]">
            Every step is ticked.
          </p>
          <p className="text-sm text-[#2F5347]/80 mt-1">
            Porchlight won&rsquo;t call this family licensed — Arizona does
            that, and the ledger is only worth anything because a human
            confirms it. If their licence has come through, record it now.
          </p>
          <form action={moveStage} className="mt-3">
            <input type="hidden" name="contact_id" value={contactId} />
            <input type="hidden" name="to_stage" value="licensed" />
            <input
              type="hidden"
              name="reason"
              value="onboarding checklist complete"
            />
            <button className="rounded-full bg-porch text-night font-semibold px-5 py-2 text-sm hover:brightness-105">
              Yes — mark licensed
            </button>
          </form>
        </div>
      )}
    </section>
  );
}
