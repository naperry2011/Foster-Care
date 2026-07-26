"use client";

import { useState } from "react";
import { eraseContact } from "@/app/(app)/contacts/actions";

export default function DangerZone({
  contactId,
  name,
}: {
  contactId: string;
  name: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");

  return (
    <div className="rounded-2xl border border-clay/40 bg-clay-tint/50 p-5">
      <h3 className="font-display font-semibold">Erase this person</h3>
      <p className="text-sm text-ink/70 mt-1">
        Removes {name} and every trace of them — messages, stage history, tasks.
        The event they came from keeps its cost, so your ledger stays honest.
        This cannot be undone.
      </p>

      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          className="mt-3 text-sm rounded-full border border-clay text-clay px-4 py-2 hover:bg-clay-tint"
        >
          Erase…
        </button>
      ) : (
        <form action={eraseContact} className="mt-3 space-y-2">
          <input type="hidden" name="contact_id" value={contactId} />
          <label className="block text-xs text-ink/70">
            Type <span className="font-mono font-semibold">ERASE</span> to confirm
          </label>
          <div className="flex gap-2">
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              className="rounded-md border border-rule px-3 py-2 text-sm w-32"
              autoFocus
            />
            <button
              type="submit"
              disabled={typed !== "ERASE"}
              className="text-sm rounded-full bg-clay text-white px-4 py-2 disabled:opacity-40"
            >
              Erase permanently
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirming(false);
                setTyped("");
              }}
              className="text-sm text-muted px-3"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
