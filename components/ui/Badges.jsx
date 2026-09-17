import { cn } from "@/lib/utils";

const levelStyles = {
  A1: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  A2: "bg-teal-50 text-teal-700 ring-teal-600/15",
  B1: "bg-sky-50 text-sky-700 ring-sky-600/15",
  B2: "bg-indigo-50 text-indigo-700 ring-indigo-600/15",
  C1: "bg-amber-50 text-amber-800 ring-amber-600/20",
};

export function LevelBadge({ level, className }) {
  return (
    <span className={cn("badge ring-1 ring-inset font-bold tracking-wide", levelStyles[level] || "bg-canvas text-muted ring-line", className)} dir="ltr">
      {level === "unknown" ? "?" : level}
    </span>
  );
}

const statusStyles = {
  pending: "bg-amber-50 text-amber-800",
  active: "bg-emerald-50 text-emerald-700",
  completed: "bg-navy-50 text-navy-700",
  rejected: "bg-red-50 text-red-700",
  cancelled: "bg-stone-100 text-stone-600",
  paid: "bg-emerald-50 text-emerald-700",
  unpaid: "bg-red-50 text-red-700",
  draft: "bg-stone-100 text-stone-600",
  published: "bg-emerald-50 text-emerald-700",
  archived: "bg-stone-100 text-stone-500",
  submitted: "bg-amber-50 text-amber-800",
  graded: "bg-emerald-50 text-emerald-700",
  missing: "bg-red-50 text-red-700",
  new: "bg-sky-50 text-sky-700",
  contacted: "bg-amber-50 text-amber-800",
  closed: "bg-stone-100 text-stone-600",
  live: "bg-red-50 text-red-700",
};

export function StatusBadge({ status, label, className }) {
  return (
    <span className={cn("badge", statusStyles[status] || "bg-canvas text-muted", className)}>
      <span className="size-1.5 rounded-full bg-current opacity-70" />
      {label}
    </span>
  );
}
