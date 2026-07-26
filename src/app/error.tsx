"use client";

import { useEffect } from "react";

export default function RootError({
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
    <main className="min-h-screen bg-dusk text-white flex items-center justify-center p-6 text-center">
      <div>
        <span className="inline-block w-3 h-3 rounded-full bg-porch mb-5" />
        <h1 className="font-display text-3xl font-semibold">
          The light flickered.
        </h1>
        <p className="mt-3 text-white/60 max-w-sm mx-auto">
          Something went wrong loading this page. Nothing was lost.
        </p>
        <button
          onClick={() => unstable_retry()}
          className="mt-7 rounded-full bg-porch text-night font-semibold px-7 py-3 hover:brightness-105"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
