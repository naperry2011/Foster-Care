export default function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  /** the handwritten aside — lowercase, human, never a label */
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between flex-wrap gap-4">
      <div>
        {eyebrow && <p className="font-hand text-2xl text-clay">{eyebrow}</p>}
        <h1 className="font-display text-3xl font-semibold mt-1">{title}</h1>
        {description && (
          <p className="text-muted mt-1.5 max-w-2xl">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}
