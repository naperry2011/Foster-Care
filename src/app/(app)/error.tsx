"use client";

import { useEffect } from "react";

// Next 16.2 passes unstable_retry (re-fetches and re-renders); reset() only
// clears state without re-fetching, which isn't what we want here.
export default function AppError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-20 text-center">
      <span className="inline-block w-3 h-3 rounded-full bg-clay mb-5" />
      <h1 className="font-display text-3xl font-semibold">
        That didn&apos;t load.
      </h1>
      <p className="mt-3 text-muted">
        Something went wrong on our end — your data is safe. Try again, and if it
        keeps happening let us know what you were doing.
      </p>
      {error.digest && (
        <p className="mt-2 text-xs text-muted/70 font-mono">
          reference {error.digest}
        </p>
      )}
      <button
        onClick={() => unstable_retry()}
        className="mt-7 rounded-full bg-porch text-night font-semibold px-7 py-3 hover:brightness-105"
      >
        Try again
      </button>
    </main>
  );
}
