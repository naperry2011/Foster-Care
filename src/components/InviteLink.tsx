"use client";

import { useState } from "react";

// Porchlight doesn't send the invitation email — the recruiter does, from
// their own address, which is the one a colleague will actually recognise.
export default function InviteLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="mt-3 flex items-center gap-2">
      <input
        readOnly
        value={url}
        aria-label="Invitation link"
        onFocus={(e) => e.currentTarget.select()}
        className="flex-1 min-w-0 rounded-lg border border-rule bg-white px-3 py-2 text-xs font-mono"
      />
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            // Clipboard is blocked in some embedded browsers; the input is
            // selectable, so there is still a way through.
            setCopied(false);
          }
        }}
        className="shrink-0 rounded-full border border-rule bg-white px-4 py-2 text-xs hover:bg-paper-2"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
