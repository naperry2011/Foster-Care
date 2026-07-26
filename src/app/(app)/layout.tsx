import AppShell from "@/components/AppShell";
import { requireUser } from "@/lib/auth";

// Every signed-in page lives under this group, so the shell — and the
// requireUser() gate — happen exactly once instead of per page.
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  return <AppShell user={user}>{children}</AppShell>;
}
