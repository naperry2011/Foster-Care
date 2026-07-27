"use client";

import { useState } from "react";
import { deleteSource } from "@/app/(app)/events/actions";

// Deleting a source is only ever right for a mistake: a typo, or an event
// created while trying the product out. Anything that has captured a person is
// refused by the database, and the copy says so before the click rather than
// after it.
export default function DeleteSource({
  sourceId,
  name,
  captured,
}: {
  sourceId: string;
  name: string;
  captured: number;
}) {
  const [confirming, setConfirming] = useState(false);

  if (captured > 0) {
    return (
      <p className="text-xs text-muted">
        {captured === 1 ? "One person was" : `${captured} people were`} captured
        here, so this source is part of your ledger and can&apos;t be deleted.
        Erase the {captured === 1 ? "contact" : "contacts"} first if this was a
        mistake.
      </p>
    );
  }

  return !confirming ? (
    <button
      onClick={() => setConfirming(true)}
      className="text-sm rounded-full border border-clay text-clay px-4 py-2 hover:bg-clay-tint"
    >
      Delete this source
    </button>
  ) : (
    <form action={deleteSource} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="source_id" value={sourceId} />
      <span className="text-sm text-ink/70">Delete &ldquo;{name}&rdquo;?</span>
      <button
        type="submit"
        className="text-sm rounded-full bg-clay text-white px-4 py-2 hover:brightness-105"
      >
        Yes, delete
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="text-sm text-muted px-3 py-2"
      >
        Cancel
      </button>
    </form>
  );
}
