"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { signOut } from "@/app/account/actions";

export default function AccountMenu({
  agencyName,
  email,
  fullName,
}: {
  agencyName: string;
  email: string;
  fullName: string | null;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const initial = (fullName || email || "?").trim().charAt(0).toUpperCase();

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2.5 hover:bg-white/10 transition-colors"
      >
        <span className="w-7 h-7 rounded-full bg-porch text-night grid place-items-center text-sm font-bold">
          {initial}
        </span>
        <span className="hidden sm:block text-sm text-white/70 max-w-[12ch] truncate">
          {agencyName}
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-60 rounded-xl border border-rule bg-white shadow-[0_18px_40px_-18px_rgba(60,47,42,.5)] overflow-hidden z-50"
        >
          <div className="px-4 py-3 border-b border-rule">
            <div className="font-display font-semibold text-ink truncate">
              {agencyName}
            </div>
            <div className="text-xs text-muted truncate">{email}</div>
          </div>
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-sm text-ink hover:bg-paper-2"
          >
            Agency settings
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="w-full text-left px-4 py-2.5 text-sm text-clay hover:bg-clay-tint"
            >
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
