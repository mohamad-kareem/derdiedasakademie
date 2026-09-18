import { cn } from "@/lib/utils";

/**
 * Registry marks. Square, bordered and restrained: a level or a status should
 * be legible at a glance in a dense table without competing with the text.
 */

const levelStyles = {
  A1: "border-emerald-700/25 bg-emerald-50 text-emerald-800",
  A2: "border-teal-700/25 bg-teal-50 text-teal-800",
  B1: "border-sky-700/25 bg-sky-50 text-sky-800",
  B2: "border-indigo-700/25 bg-indigo-50 text-indigo-800",
  C1: "border-amber-700/30 bg-amber-50 text-amber-900",
};

export function LevelBadge({ level, className }) {
  return (
    <span
      className={cn(
        "badge min-w-[26px] justify-center border font-bold tracking-[0.04em]",
        levelStyles[level] || "border-line-strong bg-cream text-muted",
        className,
      )}
      dir="ltr"
    >
      {level === "unknown" ? "—" : level}
    </span>
  );
}

const statusStyles = {
  pending: "border-amber-700/25 bg-amber-50 text-amber-900",
  active: "border-emerald-700/25 bg-emerald-50 text-emerald-800",
  completed: "border-navy-600/25 bg-navy-50 text-navy-800",
  rejected: "border-red-700/25 bg-red-50 text-red-800",
  cancelled: "border-line-strong bg-cream text-muted",
  paid: "border-emerald-700/25 bg-emerald-50 text-emerald-800",
  unpaid: "border-red-700/25 bg-red-50 text-red-800",
  draft: "border-line-strong bg-cream text-muted",
  published: "border-emerald-700/25 bg-emerald-50 text-emerald-800",
  archived: "border-line-strong bg-cream text-muted",
  submitted: "border-amber-700/25 bg-amber-50 text-amber-900",
  graded: "border-emerald-700/25 bg-emerald-50 text-emerald-800",
  missing: "border-red-700/25 bg-red-50 text-red-800",
  new: "border-sky-700/25 bg-sky-50 text-sky-800",
  contacted: "border-amber-700/25 bg-amber-50 text-amber-900",
  closed: "border-line-strong bg-cream text-muted",
  live: "border-red-700/30 bg-red-50 text-red-800",
};

export function StatusBadge({ status, label, className }) {
  return (
    <span className={cn("badge border", statusStyles[status] || "border-line-strong bg-cream text-muted", className)}>
      <span className="size-[5px] bg-current opacity-70" />
      {label}
    </span>
  );
}
