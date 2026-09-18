import { CheckCircle2, AlertTriangle, OctagonAlert } from "lucide-react";
import { cn, formatBytes, formatNumber } from "@/lib/utils";

/**
 * A measurement such as "2.5 TB". Numbers and their units are written
 * left-to-right in every language, so they are pinned that way — otherwise
 * Arabic reorders them into "TB 2.5".
 */
export function Num({ children, className }) {
  return (
    <span dir="ltr" className={cn("inline-block", className)}>
      {children}
    </span>
  );
}

/** good under 70%, warning to 89%, critical from 90%. */
export function usageState(percent) {
  if (percent >= 90) return "critical";
  if (percent >= 70) return "warning";
  return "good";
}

const STATE = {
  good: { bar: "bg-emerald-600", chip: "bg-emerald-50 text-emerald-700", Icon: CheckCircle2 },
  warning: { bar: "bg-gold-500", chip: "bg-gold-50 text-gold-600", Icon: AlertTriangle },
  critical: { bar: "bg-red-600", chip: "bg-red-50 text-red-700", Icon: OctagonAlert },
};

/**
 * One allowance: how much is used, out of how much, and whether that is fine.
 * The state is carried by an icon and a word as well as the colour, so it still
 * reads correctly in greyscale or for a colour-blind reader.
 */
export function Meter({ label, valueText, limitText, percent, stateLabel, hint, icon, locale = "en" }) {
  const state = usageState(percent);
  const { bar, chip, Icon } = STATE[state];
  return (
    <section className="card p-4">
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-navy-900">
          {icon}
          {label}
        </div>
        <span className={cn("badge", chip)}>
          <Icon className="size-3.5" aria-hidden="true" />
          {stateLabel}
        </span>
      </header>

      <p dir="ltr" className="mt-3 text-2xl font-semibold tracking-tight text-navy-900 rtl:text-right">
        {valueText}
        <span className="ms-1.5 text-sm font-normal text-muted">/ {limitText}</span>
      </p>

      <div
        className="mt-3 h-2 w-full overflow-hidden rounded-full bg-canvas"
        role="meter"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div className={cn("h-full rounded-full transition-[width]", bar)} style={{ width: `${Math.max(percent, percent > 0 ? 1.5 : 0)}%` }} />
      </div>

      <p className="mt-2 text-xs text-muted">
        <span className="font-semibold text-ink">{formatNumber(percent, locale)}%</span>
        {hint ? ` · ${hint}` : ""}
      </p>
    </section>
  );
}

/**
 * Daily outbound traffic. One measure, one hue — no legend needed, the title
 * names it. Every bar carries its exact figure on hover; the busiest day is
 * labelled outright so the scale is readable without hovering.
 */
export function DayBars({ days = [], locale = "en", emptyText }) {
  if (!days.length) return <p className="px-4 py-8 text-center text-sm text-muted">{emptyText}</p>;
  const peak = Math.max(1, ...days.map((d) => d.txBytes || 0));
  // Label the busiest day once, even when several days tie for it.
  const peakDate = days.find((d) => (d.txBytes || 0) === peak)?.date;

  return (
    <div className="px-4 py-4">
      <div className="flex h-36 items-end gap-[2px]">
        {days.map((d) => {
          const height = Math.max(2, Math.round(((d.txBytes || 0) / peak) * 100));
          const isPeak = d.date === peakDate;
          return (
            <div key={d.date} className="group relative flex h-full flex-1 flex-col justify-end" title={`${d.date} · ${formatBytes(d.txBytes, locale)}`}>
              {isPeak && (
                <Num className="mb-1 truncate text-center text-[10px] font-semibold text-navy-900">
                  {formatBytes(d.txBytes, locale, 0)}
                </Num>
              )}
              <div
                className={cn("w-full rounded-t-[4px]", isPeak ? "bg-navy-900" : "bg-navy-600/70 group-hover:bg-navy-700")}
                style={{ height: `${height}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-muted">
        <span>{days[0]?.date}</span>
        <span>{days[days.length - 1]?.date}</span>
      </div>
    </div>
  );
}
