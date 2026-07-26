import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-dusk text-white flex items-center justify-center p-6 text-center">
      <div>
        <span className="inline-block w-3 h-3 rounded-full bg-porch shadow-[0_0_24px_6px_rgba(233,162,59,.5)] mb-5" />
        <h1 className="font-display text-3xl font-semibold">
          Nobody&apos;s home here.
        </h1>
        <p className="mt-3 text-white/60 max-w-sm mx-auto">
          That page doesn&apos;t exist — the link may be old, or the record may
          have been erased.
        </p>
        <Link
          href="/"
          className="inline-block mt-7 rounded-full bg-porch text-night font-semibold px-7 py-3 hover:brightness-105"
        >
          Back to the porch
        </Link>
      </div>
    </main>
  );
}
