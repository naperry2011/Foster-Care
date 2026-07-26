// The handwritten aside — a person talking, not the product labelling itself.
export default function SectionNote({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={`font-hand text-2xl text-ink/70 ${className}`}>{children}</p>
  );
}
