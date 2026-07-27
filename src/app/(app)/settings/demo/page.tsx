import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/ui/PageHeader";
import StatTile from "@/components/ui/StatTile";
import { reseedDemo, eraseDemo } from "./actions";

export default async function DemoSettingsPage() {
  const user = await requireUser();
  if (!user.isDemo) notFound();

  const supabase = await createClient();
  const [{ count: contacts }, { count: sources }, { count: outcomes }] =
    await Promise.all([
      supabase.from("contact").select("*", { count: "exact", head: true }),
      supabase.from("source").select("*", { count: "exact", head: true }),
      supabase.from("outcome").select("*", { count: "exact", head: true }),
    ]);

  const seeded = (contacts ?? 0) > 0;

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <Link href="/settings" className="text-sm text-sage hover:underline">
        ← Settings
      </Link>
      <div className="mt-3">
        <PageHeader
          eyebrow="a working example"
          title="Demo data"
          description="Eighteen months of invented Arizona recruitment history, so every screen tells its story. Identical every time it's rebuilt."
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3 mt-8">
        <StatTile value={contacts ?? 0} label="Contacts" />
        <StatTile value={sources ?? 0} label="Sources" />
        <StatTile value={outcomes ?? 0} label="Licensed homes" tone="sage" />
      </div>

      <div className="mt-8 rounded-2xl border border-rule bg-white p-6 space-y-4">
        <div>
          <h2 className="font-display text-lg font-semibold">
            {seeded ? "Rebuild the demo" : "Fill the demo"}
          </h2>
          <p className="text-sm text-muted mt-1">
            {seeded
              ? "Erases everything here and generates it again, exactly as it was."
              : "Generates the full eighteen-month story: church fairs, ambassadors, paid social that didn't work, and the families who said “not yet” and came back."}
          </p>
        </div>
        <form action={reseedDemo}>
          <button className="rounded-full bg-porch text-night font-semibold px-6 py-3 hover:brightness-105">
            {seeded ? "Rebuild demo data" : "Generate demo data"}
          </button>
        </form>
      </div>

      {seeded && (
        <div className="mt-6 rounded-2xl border border-clay/40 bg-clay-tint/50 p-6">
          <h2 className="font-display text-lg font-semibold">Empty it out</h2>
          <p className="text-sm text-ink/70 mt-1">
            Removes every demo contact, source and outcome. The agency stays so
            you can fill it again.
          </p>
          <form action={eraseDemo} className="mt-3">
            <button className="rounded-full border border-clay text-clay px-5 py-2.5 text-sm hover:bg-clay-tint">
              Erase all demo data
            </button>
          </form>
        </div>
      )}

      <p className="text-xs text-muted mt-8 leading-relaxed">
        Every address here ends in <code>@porchlight.demo</code>, which cannot
        receive mail. The send layer also refuses outright to send from a demo
        agency, so a live email key can never reach these people.
      </p>
    </main>
  );
}
