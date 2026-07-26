import Link from "next/link";

const TONES = {
  plain: "border-rule bg-white",
  porch: "border-porch/50 bg-butter",
  sage: "border-sage/30 bg-sage-tint",
  clay: "border-clay/40 bg-clay-tint/60",
} as const;

export default function StatTile({
  value,
  label,
  href,
  tone = "plain",
  footnote,
}: {
  value: React.ReactNode;
  label: string;
  href?: string;
  tone?: keyof typeof TONES;
  footnote?: string;
}) {
  const inner = (
    <>
      <div className="font-display text-4xl font-semibold leading-none">
        {value}
      </div>
      <div className="text-sm text-muted mt-2">{label}</div>
      {footnote && <div className="text-xs text-muted/80 mt-1">{footnote}</div>}
    </>
  );
  const cls = `block rounded-2xl border p-6 ${TONES[tone]}`;

  return href ? (
    <Link
      href={href}
      className={`${cls} transition-shadow hover:shadow-[0_14px_30px_-18px_rgba(60,47,42,.45)]`}
    >
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}
