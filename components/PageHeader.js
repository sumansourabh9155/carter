export function PageHeader({ eyebrow, title, description, children }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border/70 pb-5">
      <div>
        {eyebrow && (
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-primary">{eyebrow}</p>
        )}
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}

export function PageContainer({ children }) {
  return <div className="mx-auto max-w-6xl space-y-7 px-6 py-7">{children}</div>;
}
