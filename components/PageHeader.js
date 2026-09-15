/*
  Carter page header ("mid bar") — measured on the live platform:
    title      600 20px/28px, Text/Primary
    eyebrow    400 12px/18px, Brand/600 (it reads as a breadcrumb, not an
               uppercase label — the platform does not letterspace it)
    body       400 14px/20px, Text/Secondary
    The row carries NO bottom rule; separation comes from the 24px stack.
*/
export function PageHeader({ eyebrow, title, description, children }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[20px] font-semibold leading-7 text-foreground">{title}</h1>
        {eyebrow && <p className="mt-1 text-[12px] leading-[18px] text-brand-600">{eyebrow}</p>}
        {description && (
          <p className="mt-2 max-w-2xl text-[14px] leading-5 text-muted-foreground">{description}</p>
        )}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}

// Content column — the platform leaves a 24px gutter between the 240px side
// nav and the first card, and stacks sections 24px apart.
export function PageContainer({ children }) {
  return <div className="mx-auto max-w-[1200px] space-y-6 px-6 py-6">{children}</div>;
}
