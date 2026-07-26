const TONES = {
  plain: "border-rule bg-white text-ink",
  quiet: "border-rule bg-paper-2 text-muted",
  porch: "border-porch/50 bg-butter text-ink",
  sage: "border-sage/40 bg-sage-tint text-sage",
  clay: "border-clay/50 bg-clay-tint text-clay",
} as const;

export default function Pill({
  tone = "plain",
  children,
}: {
  tone?: keyof typeof TONES;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-block rounded-full border px-3 py-1 text-xs ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}
