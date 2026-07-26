import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const KIND_LABELS: Record<string, string> = {
  wake_up: "Wake-up",
  reply: "Reply",
  cold_flag: "Cold flag",
  outcome_confirm: "Confirm outcome",
};

export default async function TasksPage() {
  const supabase = await createClient();

  const { data: tasks } = await supabase
    .from("task")
    .select("id, kind, title, due_on, created_at, contact_id")
    .is("done_at", null)
    .order("due_on")
    .limit(200);

  async function completeTask(formData: FormData) {
    "use server";
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    await supabase
      .from("task")
      .update({ done_at: new Date().toISOString() })
      .eq("id", String(formData.get("task_id")));
    revalidatePath("/tasks");
  }

  return (
    <>
      <main className="max-w-5xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-semibold">Tasks</h1>
        <p className="text-sm text-muted mt-1">
          Wake-ups, replies, and cold flags — the moments a human should step in.
        </p>
        <ul className="mt-6 divide-y divide-rule rounded-lg border border-rule bg-white">
          {(tasks ?? []).map((t) => (
            <li key={t.id} className="px-5 py-4 flex items-center justify-between gap-4">
              <div>
                <span className="text-xs rounded-full bg-paper-2 border border-rule px-2 py-0.5 mr-2">
                  {KIND_LABELS[t.kind] ?? t.kind}
                </span>
                {t.contact_id ? (
                  <Link
                    href={`/contacts/${t.contact_id}`}
                    className="text-sm hover:text-sage hover:underline"
                  >
                    {t.title}
                  </Link>
                ) : (
                  <Link
                    href="/ledger"
                    className="text-sm hover:text-sage hover:underline"
                  >
                    {t.title}
                  </Link>
                )}
              </div>
              <form action={completeTask}>
                <input type="hidden" name="task_id" value={t.id} />
                <button className="text-sm rounded-full border border-sage text-sage px-4 py-1.5 hover:bg-sage-tint">
                  Done
                </button>
              </form>
            </li>
          ))}
          {(tasks ?? []).length === 0 && (
            <li className="px-5 py-8 text-center text-muted">
              Nothing needs a human right now.
            </li>
          )}
        </ul>
      </main>
    </>
  );
}
