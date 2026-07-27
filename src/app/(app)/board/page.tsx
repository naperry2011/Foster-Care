import Link from "next/link";
import StageSelect from "@/components/StageSelect";
import PageHeader from "@/components/ui/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { BOARD_STAGES, STAGE_LABELS, type Stage } from "@/lib/stages";

export default async function BoardPage() {
  const supabase = await createClient();

  // The board deliberately keeps a cap where the ledger and cron do not: this
  // renders a DOM node per contact, so "all of them" stops being a kindness
  // somewhere north of a few thousand cards. The difference from before is
  // that the cap is now visible on the page (below) instead of the page just
  // quietly ending. See audit F-002.
  const BOARD_CAP = 2000;
  const { data: contacts } = await supabase
    .from("contact")
    .select(
      "id, first_name, last_name, phone, email, stage, wake_up_on, wake_up_fired_at, source(name)"
    )
    .in("stage", BOARD_STAGES as string[])
    .order("captured_at", { ascending: false })
    .range(0, BOARD_CAP - 1);
  const truncated = (contacts ?? []).length >= BOARD_CAP;

  const byStage = new Map<Stage, NonNullable<typeof contacts>>(
    BOARD_STAGES.map((s) => [s, []])
  );
  for (const c of contacts ?? []) {
    byStage.get(c.stage as Stage)?.push(c);
  }

  return (
    <>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <PageHeader
          eyebrow="where everyone stands"
          title="Stage board"
          description="“Not yet” is a holding lane, not a rejection — every card there carries a wake-up date, and the system shows up on the day they picked."
          actions={
            <Link
              href="/contacts/new"
              className="rounded-full bg-porch text-night font-semibold px-5 py-2.5 text-sm hover:brightness-105"
            >
              Add contact
            </Link>
          }
        />
        {truncated && (
          <p className="mt-6 rounded-xl border border-porch/40 bg-butter px-4 py-3 text-sm">
            Showing the {BOARD_CAP.toLocaleString()} most recent people. The
            board is capped so it stays usable; <strong>the ledger and the
            waiting-room dates are not</strong> and still cover everyone. Use{" "}
            <Link href="/contacts" className="underline">
              Contacts
            </Link>{" "}
            to search the rest.
          </p>
        )}

        {/* Below md the five lanes swipe sideways and keep their shape. Stacking
            them vertically turns a board into a very long list, which is the one
            thing a board is for not being. */}
        <div
          className="mt-8 flex gap-4 items-start overflow-x-auto snap-x snap-mandatory
                     -mx-4 px-4 pb-3 sm:-mx-6 sm:px-6
                     md:mx-0 md:px-0 md:pb-0 md:grid md:grid-cols-5 md:overflow-visible"
        >
          {BOARD_STAGES.map((s) => {
            const cards = byStage.get(s) ?? [];
            const isWaiting = s === "not_yet";
            return (
              <div
                key={s}
                className={`rounded-2xl border p-3 w-[78vw] shrink-0 snap-start md:w-auto md:shrink ${
                  isWaiting
                    ? "border-porch/60 bg-butter"
                    : "border-rule bg-paper-2/60"
                }`}
              >
                <div className="flex items-center justify-between px-1 mb-3">
                  <span className="font-display text-base font-semibold">
                    {STAGE_LABELS[s]}
                  </span>
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
                        <Link
                          href={`/contacts/${c.id}`}
                          className="font-medium text-sm hover:text-sage hover:underline"
                        >
                          {[c.first_name, c.last_name].filter(Boolean).join(" ") ||
                            c.phone ||
                            c.email}
                        </Link>
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
                    <div className="font-hand text-lg text-muted text-center py-4">
                      nobody here yet
                    </div>
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
