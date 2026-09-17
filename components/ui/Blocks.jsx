import { cn } from "@/lib/utils";

export function PageHeader({ title, description, actions, children }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {children}
        <h1 className="text-2xl font-semibold tracking-tight text-navy-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, hint, icon, tone = "navy" }) {
  const tones = {
    navy: "bg-navy-50 text-navy-700",
    gold: "bg-gold-50 text-gold-600",
    green: "bg-emerald-50 text-emerald-700",
    red: "bg-red-50 text-red-700",
  };
  return (
    <div className="card flex items-start gap-4 p-4">
      {icon && <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", tones[tone])}>{icon}</div>}
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted">{label}</p>
        <p className="mt-0.5 text-2xl font-semibold tracking-tight text-navy-900">{value}</p>
        {hint && <p className="mt-0.5 truncate text-xs text-muted">{hint}</p>}
      </div>
    </div>
  );
}

export function Panel({ title, action, children, className, bodyClassName }) {
  return (
    <section className={cn("card overflow-hidden", className)}>
      {title && (
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h2 className="text-sm font-semibold text-navy-900">{title}</h2>
          {action}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

export function EmptyState({ icon, title, text, action, className }) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-10 text-center", className)}>
      {icon && <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-canvas text-muted">{icon}</div>}
      <p className="text-sm font-semibold text-ink">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-muted">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
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
