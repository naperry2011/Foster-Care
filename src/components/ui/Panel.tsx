const TONES = {
  paper: "bg-white border-rule",
  butter: "bg-butter border-porch/40",
  sage: "bg-sage-tint border-sage/30",
  clay: "bg-clay-tint/60 border-clay/40",
} as const;

export type PanelTone = keyof typeof TONES;

export default function Panel({
  tone = "paper",
  tilt,
  className = "",
  children,
}: {
  tone?: PanelTone;
  /** a degree of hand-placed imperfection; use sparingly */
  tilt?: "a" | "b";
  className?: string;
  children: React.ReactNode;
}) {
  const tiltClass = tilt === "a" ? "-rotate-[0.4deg]" : tilt === "b" ? "rotate-[0.4deg]" : "";
  return (
    <div
      className={`rounded-2xl border shadow-[0_14px_30px_-20px_rgba(60,47,42,.4)] ${TONES[tone]} ${tiltClass} ${className}`}
    >
      {children}
    </div>
  );
}
