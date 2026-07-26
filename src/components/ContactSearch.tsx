"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

export default function ContactSearch({ initial }: { initial: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState(initial);
  const [, startTransition] = useTransition();

  useEffect(() => {
    const t = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (value.trim()) next.set("q", value.trim());
      else next.delete("q");
      next.delete("page"); // a new search starts at the beginning
      const qs = next.toString();
      startTransition(() => router.replace(qs ? `/contacts?${qs}` : "/contacts"));
    }, 300);
    return () => clearTimeout(t);
    // params is intentionally not a dependency: it changes as a result of this
    // effect, which would restart the debounce forever.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <input
      type="search"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      placeholder="Search name, email, phone…"
      className="rounded-full border border-rule bg-white px-4 py-2 text-sm w-full sm:w-72 focus:outline-none focus:border-porch"
    />
  );
}
