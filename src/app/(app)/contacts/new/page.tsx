import Link from "next/link";
import AddContactForm from "@/components/AddContactForm";
import PageHeader from "@/components/ui/PageHeader";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Add a contact" };

// Adding somebody you met away from an event. The quick-add on an event page
// stays where it is — it is the ten-second version for standing at a table.
// This is the deliberate one, with room for a last name and a note.
export default async function NewContactPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data: sources } = await supabase
    .from("source")
    .select("id, name, kind")
    .order("created_at", { ascending: false });

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <Link href="/contacts" className="text-sm text-sage hover:underline">
        ← All contacts
      </Link>
      <div className="mt-3">
        <PageHeader
          eyebrow="before they vanish"
          title="Add a contact"
          description="Somebody you met away from a table. Ten seconds now beats a business card you'll lose."
        />
      </div>

      <AddContactForm sources={sources ?? []} error={error} />
    </main>
  );
}
