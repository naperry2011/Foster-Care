import Link from "next/link";

export default function AppNav({ agencyName }: { agencyName: string }) {
  return (
    <header className="bg-dusk text-white">
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <span className="w-2.5 h-2.5 rounded-full bg-porch shadow-[0_0_16px_3px_rgba(233,162,59,.5)]" />
          <span className="font-semibold text-lg">Porchlight</span>
        </Link>
        <nav className="flex items-center gap-5 text-sm">
          <Link href="/events" className="text-white/80 hover:text-white">
            Events
          </Link>
          <Link href="/board" className="text-white/80 hover:text-white">
            Board
          </Link>
          <Link href="/contacts" className="text-white/80 hover:text-white">
            Contacts
          </Link>
          <Link href="/tasks" className="text-white/80 hover:text-white">
            Tasks
          </Link>
          <Link href="/ambassadors" className="text-white/80 hover:text-white">
            Ambassadors
          </Link>
          <Link href="/ledger" className="text-porch hover:text-glow font-medium">
            Ledger
          </Link>
        </nav>
        <span className="text-sm text-white/50 hidden sm:block">{agencyName}</span>
      </div>
    </header>
  );
}
