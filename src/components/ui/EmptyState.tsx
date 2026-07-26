import Link from "next/link";

// An empty screen is the first thing a new agency sees. It should invite,
// not apologise.
export default function EmptyState({
  title,
  body,
  ctaLabel,
  ctaHref,
  compact,
}: {
  title: string;
  body?: string;
  ctaLabel?: string;
  ctaHref?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border-2 border-dashed border-rule bg-butter/60 text-center ${
        compact ? "p-6" : "p-10"
      }`}
    >
      <h2
        className={`font-display font-semibold ${compact ? "text-lg" : "text-2xl"}`}
      >
        {title}
      </h2>
      {body && (
        <p className="mt-2 text-ink/70 max-w-md mx-auto text-sm">{body}</p>
      )}
      {ctaLabel && ctaHref && (
        <Link
          href={ctaHref}
          className="inline-block mt-5 rounded-full bg-porch text-night font-semibold px-6 py-3 hover:brightness-105"
        >
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}
