import { cn } from "@/lib/utils";

/**
 * The shared page furniture: a titled header rule, statistic figures, bordered
 * panels and an empty notice. Square corners, hairline rules, no shadows —
 * the vocabulary of a printed register rather than a consumer app.
 */

/** "Administration / Courses" — a plain trail of where this page sits. */
export function Breadcrumb({ trail = [] }) {
  return (
    <p className="mb-1.5 flex flex-wrap items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted">
      {trail.map((step, i) => (
        <span key={step} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-line-strong">/</span>}
          <span className={i === trail.length - 1 ? "text-navy-700" : undefined}>{step}</span>
        </span>
      ))}
    </p>
  );
}

export function PageHeader({ title, description, actions, children }) {
  return (
    <div className="mb-5 border-b border-line pb-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {children}
          <h1 className="font-display text-[22px] font-semibold leading-tight tracking-tight text-navy-900">{title}</h1>
          {description && <p className="mt-1 text-[13px] leading-snug text-muted">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

/**
 * A single figure. The tone shows as a thin rule down the leading edge rather
 * than a coloured tile, so a row of them reads as one table of statistics.
 */
export function StatCard({ label, value, hint, icon, tone = "navy" }) {
  const tones = {
    navy: "before:bg-navy-700",
    gold: "before:bg-gold-500",
    green: "before:bg-emerald-700",
    red: "before:bg-red-700",
  };
  return (
    <div
      className={cn(
        "card relative overflow-hidden px-3.5 py-3 ps-4",
        "before:absolute before:inset-y-0 before:start-0 before:w-[3px] before:content-['']",
        tones[tone] || tones.navy,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-muted">{label}</p>
        {icon && <span className="shrink-0 text-muted/50 [&>svg]:size-4">{icon}</span>}
      </div>
      <p className="mt-1.5 text-[21px] font-semibold leading-none tracking-tight text-navy-900 tabular">{value}</p>
      {hint && <p className="mt-1.5 truncate text-[11.5px] text-muted">{hint}</p>}
    </div>
  );
}

export function Panel({ title, action, children, className, bodyClassName }) {
  return (
    <section className={cn("card overflow-hidden", className)}>
      {title && (
        <header className="panel-head">
          <h2 className="panel-title">{title}</h2>
          {action}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

export function EmptyState({ icon, title, text, action, className }) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-8 text-center", className)}>
      {icon && <div className="mb-2.5 flex size-9 items-center justify-center rounded-[2px] border border-line bg-cream text-muted">{icon}</div>}
      <p className="text-[13px] font-semibold text-ink">{title}</p>
      {text && <p className="mt-1 max-w-sm text-[12.5px] text-muted">{text}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function Field({ label, hint, children, className }) {
  return (
    <label className={cn("block", className)}>
      {label && <span className="label">{label}</span>}
      {children}
      {hint && <span className="hint block">{hint}</span>}
    </label>
  );
}
