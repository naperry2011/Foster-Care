import PageHeader from "@/components/ui/PageHeader";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { makeSlug } from "@/lib/slug";
import { revalidatePath } from "next/cache";

// An ambassador is a source of kind 'ambassador': their personal share link
// is a capture link, so every referral is attributed automatically.
export default async function AmbassadorsPage() {
  await requireUser();
  const supabase = await createClient();

  const { data: ambassadors } = await supabase
    .from("source")
    .select("id, name, slug, created_at, contact(stage)")
    .eq("kind", "ambassador")
    .order("created_at", { ascending: false });

  async function createAmbassador(formData: FormData) {
    "use server";
    const { requireUser } = await import("@/lib/auth");
    const { createClient } = await import("@/lib/supabase/server");
    const user = await requireUser();
    const supabase = await createClient();
    const name = String(formData.get("name") ?? "").trim();
    if (!name) return;
    const { error } = await supabase.from("source").insert({
      agency_id: user.agencyId,
      kind: "ambassador",
      name,
      slug: makeSlug(name),
      owner_user_id: user.id,
    });
    if (error) throw error;
    revalidatePath("/ambassadors");
  }

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return (
    <>
      <main className="max-w-5xl mx-auto px-6 py-8">
        <PageHeader
          eyebrow="families invite families"
          title="Ambassadors"
          description="Your best recruiters already foster. Give each one a personal link and finally measure the word of mouth nobody has ever been able to count."
        />

        <form action={createAmbassador} className="mt-8 flex gap-3">
          <input
            name="name"
            required
            placeholder="Foster parent or volunteer name"
            className="flex-1 rounded-md border border-rule bg-white px-4 py-3"
          />
          <button className="rounded-full bg-porch text-night font-medium px-6 hover:brightness-105">
            Create link
          </button>
        </form>

        <ul className="mt-8 divide-y divide-rule rounded-2xl border border-rule bg-white overflow-hidden">
          {(ambassadors ?? []).map((a) => {
            const stages = (a.contact as unknown as { stage: string }[]) ?? [];
            const reached = stages.length;
            const considering = stages.filter((c) =>
              ["curious", "considering", "not_yet"].includes(c.stage)
            ).length;
            const licensed = stages.filter((c) => c.stage === "licensed").length;
            return (
              <li key={a.id} className="px-5 py-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <div className="font-medium">{a.name}</div>
                    <a
                      href={`${base}/c/${a.slug}`}
                      className="text-xs font-mono text-sage underline break-all"
                    >
                      {base}/c/{a.slug}
                    </a>
                  </div>
                  <div className="flex gap-6 text-sm text-muted shrink-0">
                    <span>
                      <span className="font-semibold text-ink">{reached}</span> reached
                    </span>
                    <span>
                      <span className="font-semibold text-ink">{considering}</span> considering
                    </span>
                    <span>
                      <span className="font-semibold text-sage">{licensed}</span> licensed
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
          {(ambassadors ?? []).length === 0 && (
            <li className="px-5 py-10 text-center">
              <p className="font-hand text-2xl text-ink/70">
                no ambassadors yet
              </p>
              <p className="text-sm text-muted mt-1">
                Start with the foster parent who already tells everyone.
              </p>
            </li>
          )}
        </ul>
      </main>
    </>
  );
}
