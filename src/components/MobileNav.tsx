"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Below md the seven links do not fit in a row, and a sideways-scrolling strip
// with no affordance reads as broken. This is the same list behind a button.
export default function MobileNav({
  items,
}: {
  items: { href: string; label: string; accent?: boolean }[];
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        aria-label={open ? "Close menu" : "Open menu"}
        className="flex items-center justify-center w-10 h-10 -mr-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 22 22"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          {open ? (
            <>
              <path d="M5 5l12 12" />
              <path d="M17 5L5 17" />
            </>
          ) : (
            <>
              <path d="M3 6h16" />
              <path d="M3 11h16" />
              <path d="M3 16h16" />
            </>
          )}
        </svg>
      </button>

      {open && (
        <div
          id="mobile-nav-panel"
          className="absolute left-0 right-0 top-full z-40 bg-dusk border-t border-white/10 shadow-xl"
        >
          <nav className="flex flex-col py-2">
            {items.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  // Close on the click rather than on the route change, so the
                  // panel never survives a navigation and covers the page.
                  onClick={() => setOpen(false)}
                  className={`px-6 py-3.5 text-base border-l-2 ${
                    active
                      ? "border-porch bg-white/5 text-white font-medium"
                      : "border-transparent"
                  } ${
                    item.accent && !active
                      ? "text-porch font-medium"
                      : active
                        ? ""
                        : "text-white/80"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </div>
  );
}
