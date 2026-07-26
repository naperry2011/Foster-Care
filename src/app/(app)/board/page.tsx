import StageSelect from "@/components/StageSelect";
import { createClient } from "@/lib/supabase/server";
import { BOARD_STAGES, STAGE_LABELS, type Stage } from "@/lib/stages";

export default async function BoardPage() {
  const supabase = await createClient();

  const { data: contacts } = await supabase
    .from("contact")
    .select(
      "id, first_name, last_name, phone, email, stage, wake_up_on, wake_up_fired_at, source(name)"
    )
    .in("stage", BOARD_STAGES as string[])
    .order("captured_at", { ascending: false })
    .limit(1000);

  const byStage = new Map<Stage, NonNullable<typeof contacts>>(
    BOARD_STAGES.map((s) => [s, []])
  );
  for (const c of contacts ?? []) {
    byStage.get(c.stage as Stage)?.push(c);
  }

  return (
    <>
      <main className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-semibold">Stage board</h1>
        <p className="text-sm text-muted mt-1">
          &ldquo;Not yet&rdquo; is a holding lane, not a rejection — every card
          there should carry a wake-up date.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-5 items-start">
          {BOARD_STAGES.map((s) => {
            const cards = byStage.get(s) ?? [];
            const isWaiting = s === "not_yet";
            return (
              <div
                key={s}
                className={`rounded-lg border p-3 ${
                  isWaiting
                    ? "border-porch/60 bg-glow/20"
                    : "border-rule bg-paper-2/60"
                }`}
              >
                <div className="flex items-center justify-between px-1 mb-3">
                  <span className="text-sm font-semibold">{STAGE_LABELS[s]}</span>
                  <span className="text-xs text-muted">{cards.length}</span>
                </div>
                <div className="space-y-2">
                  {cards.map((c) => {
                    const src = c.source as unknown as { name: string } | null;
                    return (
                      <div
                        key={c.id}
                        className="rounded-md bg-white border border-rule p-3 shadow-sm"
                      >
                        <div className="font-medium text-sm">
                          {[c.first_name, c.last_name].filter(Boolean).join(" ") ||
                            c.phone ||
                            c.email}
                        </div>
                        <div className="text-xs text-muted mt-0.5">{src?.name}</div>
                        {isWaiting && (
                          <div
                            className={`text-xs mt-1 font-medium ${
                              c.wake_up_fired_at ? "text-sage" : "text-porch"
                            }`}
                          >
                            {!c.wake_up_on
                              ? "no wake-up date!"
                              : c.wake_up_fired_at
                                ? `woke ${c.wake_up_on} — task waiting`
                                : `wakes ${c.wake_up_on}`}
                          </div>
                        )}
                        <div className="mt-2">
                          <StageSelect contactId={c.id} stage={c.stage as Stage} />
                        </div>
                      </div>
                    );
                  })}
                  {cards.length === 0 && (
                    <div className="text-xs text-muted text-center py-4">empty</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </>
  );
}
