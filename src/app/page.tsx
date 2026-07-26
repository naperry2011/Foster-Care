import Link from "next/link";
import Landing from "@/components/Landing";
import AppShell from "@/components/AppShell";
import StatTile from "@/components/ui/StatTile";
import EmptyState from "@/components/ui/EmptyState";
import GettingStarted from "@/components/GettingStarted";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// `/` is both the public landing page and the signed-in dashboard, so it sits
// outside the (app) route group and renders the shell itself.
export default async function Home() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return <Landing />;
  }

  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) return <Landing />;

  const user = await requireUser();

  const [
    { count: contacts },
    { count: sources },
    { count: waiting },
    { count: licensed },
    { data: tasks },
    { count: teammates },
    { count: myCounties },
  ] = await Promise.all([
    supabase.from("contact").select("*", { count: "exact", head: true }),
    supabase.from("source").select("*", { count: "exact", head: true }),
    supabase
      .from("contact")
      .select("*", { count: "exact", head: true })
      .eq("stage", "not_yet"),
    supabase.from("outcome").select("*", { count: "exact", head: true }),
    supabase
      .from("task")
      .select("id, kind, title, contact_id")
      .is("done_at", null)
      .order("due_on")
      .limit(5),
    supabase.from("app_user").select("*", { count: "exact", head: true }),
    supabase.from("agency_county").select("*", { count: "exact", head: true }),
  ]);

  // Ticks itself off what already exists; hides itself once all five are done.
  const gettingStarted = [
    {
      label: "Create your first event or source",
      done: (sources ?? 0) > 0,
      href: "/events",
      hint: "Everything traces back to where somebody was first reached.",
    },
    {
      label: "Capture your first contact",
      done: (contacts ?? 0) > 0,
      href: "/events",
      hint: "Scan your own QR code and put yourself in — it takes ten seconds.",
    },
    {
      label: "Tell us which counties you recruit in",
      done: (myCounties ?? 0) > 0,
      href: "/arizona",
      hint: "Unlocks the county figures Arizona publishes.",
    },
    {
      label: "Record a home you've already licensed",
      done: (licensed ?? 0) > 0,
      href: "/ledger/backfill",
      hint: "The ledger argues from history. Give it some.",
    },
    {
      label: "Invite a teammate",
      done: (teammates ?? 0) > 1,
      href: "/settings/team",
      hint: "Recruitment outlives any one recruiter.",
    },
  ];

  const firstName = user.fullName?.trim().split(" ")[0];
  const isEmpty = (contacts ?? 0) === 0 && (sources ?? 0) === 0;

  const stats = [
    { label: "Contacts captured", value: contacts ?? 0, href: "/contacts" },
    { label: "Sources & events", value: sources ?? 0, href: "/events" },
    {
      label: "Held warmly",
      value: waiting ?? 0,
      href: "/contacts?stage=not_yet",
      tone: "porch" as const,
    },
    {
      label: "Licensed homes",
      value: licensed ?? 0,
      href: "/ledger",
      tone: "sage" as const,
    },
  ];

  return (
    <AppShell user={user}>
      <main className="max-w-6xl mx-auto px-6 py-10">
        <p className="font-hand text-2xl text-clay">
          {firstName ? `evening, ${firstName}` : "welcome back"}
        </p>
        <h1 className="font-display text-3xl font-semibold mt-1">
          {user.agencyName}
        </h1>

        {isEmpty ? (
          <div className="mt-8">
            <EmptyState
              title="Let's light the porch."
              body="Everything starts with one event. Create it, get a QR code, and the next person who stops at your table stops being a memory."
              ctaLabel="Create your first event"
              ctaHref="/events"
            />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mt-8">
            {stats.map((s) => (
              <StatTile
                key={s.label}
                value={s.value}
                label={s.label}
                href={s.href}
                tone={s.tone ?? "plain"}
              />
            ))}
          </div>
        )}

        <GettingStarted steps={gettingStarted} />

        <section className="mt-10">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-xl font-semibold">
              What needs you today
            </h2>
            <Link href="/tasks" className="text-sm text-sage hover:underline">
              All tasks →
            </Link>
          </div>
          <ul className="mt-3 divide-y divide-rule rounded-2xl border border-rule bg-white overflow-hidden">
            {(tasks ?? []).map((t) => (
              <li key={t.id}>
                <Link
                  href={t.contact_id ? `/contacts/${t.contact_id}` : "/tasks"}
                  className="block px-5 py-3.5 text-sm hover:bg-paper-2"
                >
                  {t.title}
                </Link>
              </li>
            ))}
            {(tasks ?? []).length === 0 && (
              <li className="px-5 py-6 text-center text-sm text-muted">
                Nothing needs a human right now. The waiting room is doing its
                job quietly.
              </li>
            )}
          </ul>
        </section>
      </main>
    </AppShell>
  );
}
