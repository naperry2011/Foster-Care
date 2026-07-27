export default function Loading() {
  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <div className="animate-pulse space-y-6">
        <div className="h-4 w-32 rounded-full bg-rule/70" />
        <div className="h-9 w-72 rounded-lg bg-rule/60" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 rounded-2xl border border-rule bg-white/60" />
          ))}
        </div>
        <div className="h-64 rounded-2xl border border-rule bg-white/60" />
      </div>
      <span className="sr-only">Loading…</span>
    </main>
  );
}
