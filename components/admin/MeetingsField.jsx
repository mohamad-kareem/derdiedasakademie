"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import { clockOf, minutesOfClock, sortMeetings, DAY_KEYS } from "@/lib/schedule";
import { cn } from "@/lib/utils";

/**
 * When the course meets.
 *
 * A course is a standing arrangement — Monday and Wednesday at six — so this
 * is a list of weekly slots rather than a date. The days are buttons because
 * that is how the arrangement is decided in the first place ("Mondays and
 * Wednesdays"), and a time is set once for the pair.
 *
 * The slots travel with the ordinary course form as a small JSON field, which
 * is the only honest way to post a list of varying length.
 */
export default function MeetingsField({ course = {} }) {
  const { t } = useI18n();
  const [meetings, setMeetings] = useState(() => sortMeetings(course.meetings || []).map((m) => ({ day: m.day, start: m.start })));
  const [time, setTime] = useState(() => clockOf(course.meetings?.[0]?.start ?? 18 * 60));

  const has = (d, start) => meetings.some((m) => m.day === d && m.start === start);

  function toggle(d) {
    const start = minutesOfClock(time);
    setMeetings((list) =>
      has(d, start) ? list.filter((m) => !(m.day === d && m.start === start)) : sortMeetings([...list, { day: d, start }]),
    );
  }

  const start = minutesOfClock(time);

  return (
    <div className="sm:col-span-2">
      <input type="hidden" name="meetings" value={JSON.stringify(meetings)} />
      <span className="label">{t("admin.timetable.whenItMeets")}</span>

      <div className="rounded-[3px] border border-line bg-cream/60 p-3">
        <div className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="hint mb-1 block">{t("admin.timetable.at")}</span>
            <input type="time" step="300" value={time} onChange={(e) => setTime(e.target.value)} className="input h-9 w-32 py-0" />
          </label>
          <div className="min-w-0">
            <span className="hint mb-1 block">{t("admin.timetable.onDays")}</span>
            <div className="flex flex-wrap gap-1">
              {DAY_KEYS.map((key, d) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggle(d)}
                  aria-pressed={has(d, start)}
                  className={cn(
                    "h-9 min-w-[46px] rounded-[3px] border px-2 text-[12.5px] font-medium",
                    has(d, start)
                      ? "border-navy-900 bg-navy-900 text-white"
                      : "border-line bg-paper text-muted hover:bg-cream hover:text-navy-900",
                  )}
                >
                  {t(`weekdays.short.${key}`)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {meetings.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1.5 border-t border-line pt-3">
            {meetings.map((m) => (
              <li key={`${m.day}:${m.start}`}>
                <button
                  type="button"
                  onClick={() => setMeetings((list) => list.filter((x) => !(x.day === m.day && x.start === m.start)))}
                  className="inline-flex items-center gap-1.5 rounded-[2px] border border-line bg-paper px-2 py-1 text-[12px] text-ink hover:border-red-300 hover:text-red-700"
                  title={t("admin.timetable.removeSlot")}
                >
                  <span className="font-medium">{t(`weekdays.short.${DAY_KEYS[m.day]}`)}</span>
                  <span className="tabular text-muted">{clockOf(m.start)}</span>
                  <X className="size-3" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3 grid gap-3 border-t border-line pt-3 sm:grid-cols-2">
          <label className="block">
            <span className="hint mb-1 block">{t("admin.fields.duration")}</span>
            <input type="number" name="sessionMin" min="15" step="5" defaultValue={course.sessionMin ?? 90} className="input h-9 py-0" />
          </label>
          <label className="block">
            <span className="hint mb-1 block">{t("admin.timetable.weeksAhead")}</span>
            <input type="number" name="weeksAhead" min="0" max="12" defaultValue={course.weeksAhead ?? 3} className="input h-9 py-0" />
            <span className="hint mt-1 block">{t("admin.timetable.weeksAheadHint")}</span>
          </label>
        </div>
      </div>
    </div>
  );
}
