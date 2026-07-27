import Link from "next/link";
import AccountMenu from "@/components/AccountMenu";
import MobileNav from "@/components/MobileNav";
import type { CurrentUser } from "@/lib/auth";

const NAV = [
  { href: "/board", label: "Board" },
  { href: "/contacts", label: "Contacts" },
  { href: "/events", label: "Events" },
  { href: "/tasks", label: "Tasks" },
  { href: "/ambassadors", label: "Ambassadors" },
  { href: "/arizona", label: "Arizona" },
  { href: "/ledger", label: "Ledger", accent: true },
];

export default function AppShell({
  user,
  children,
}: {
  user: CurrentUser;
  children: React.ReactNode;
}) {
  return (
    <div className="flex-1 flex flex-col">
      {/* relative so the mobile panel can anchor to the header, not the page */}
      <header className="bg-dusk text-white relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-porch shadow-[0_0_16px_3px_rgba(233,162,59,.5)]" />
            <span className="font-display font-semibold text-xl">Porchlight</span>
          </Link>
          {/* Seven links do not fit under md; MobileNav carries the same list. */}
          <nav className="hidden md:flex items-center gap-4 lg:gap-5 text-sm">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap transition-colors ${
                  item.accent
                    ? "text-porch hover:text-glow font-medium"
                    : "text-white/75 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <AccountMenu
              agencyName={user.agencyName}
              email={user.email}
              fullName={user.fullName}
            />
            <MobileNav items={NAV} />
          </div>
        </div>
      </header>
      {user.isDemo && (
        <div className="bg-clay text-white text-center text-sm py-2 px-4 print:hidden">
          <strong>Demo data</strong> — these are invented families, not a real
          agency. No message is ever sent from here.{" "}
          <Link href="/settings/demo" className="underline">
            Manage demo data
          </Link>
        </div>
      )}
      <div className="flex-1">{children}</div>
    </div>
  );
}
