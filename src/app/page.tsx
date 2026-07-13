import Link from "next/link";
import Landing from "@/components/Landing";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  // No Supabase configured yet (fresh deploy) — show the public landing page.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return <Landing />;
  }

  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  // signed-out visitors get the public landing page
  if (!authUser) return <Landing />;

  const user = await requireUser();

  const [{ count: contacts }, { count: sources }, { count: waiting }] =
    await Promise.all([
      supabase.from("contact").select("*", { count: "exact", head: true }),
      supabase.from("source").select("*", { count: "exact", head: true }),
      supabase
        .from("contact")
        .select("*", { count: "exact", head: true })
        .eq("stage", "not_yet"),
    ]);

  const stats = [
    { label: "Contacts captured", value: contacts ?? 0, href: "/contacts" },
    { label: "Sources & events", value: sources ?? 0, href: "/events" },
    { label: "In the waiting room", value: waiting ?? 0, href: "/contacts?stage=not_yet" },
  ];

  return (
    <div className="flex-1">
      <header className="bg-dusk text-white">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-porch shadow-[0_0_16px_3px_rgba(233,162,59,.5)]" />
            <span className="font-semibold text-lg">Porchlight</span>
          </div>
          <span className="text-sm text-white/60">{user.agencyName}</span>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-semibold">
          Welcome{user.fullName ? `, ${user.fullName.split(" ")[0]}` : ""}
        </h1>
        <div className="grid gap-4 sm:grid-cols-3 mt-8">
          {stats.map((s) => (
            <Link
              key={s.label}
              href={s.href}
              className="rounded-lg border border-rule bg-white p-6 hover:shadow-md transition-shadow"
            >
              <div className="text-3xl font-semibold">{s.value}</div>
              <div className="text-sm text-muted mt-1">{s.label}</div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
