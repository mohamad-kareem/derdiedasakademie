import Link from "next/link";
import { Video, CalendarDays, ArrowRight } from "lucide-react";
import { LevelBadge } from "@/components/ui/Badges";
import { EmptyState } from "@/components/ui/Blocks";
import { scheduleText } from "@/lib/schedule";
import { cn, formatDate, formatTime } from "@/lib/utils";

/**
 * The academy read as a list of courses.
 *
 * A term generates hundreds of classes, and a screen that lists them one under
 * another tells you nothing — they are all called "Session 4" and they all
 * look alike. What you actually want to know is the state of each *course*:
 * when it next meets, how far through it is, and whether its seats are filled.
 * So there is one line per course, and the classes are summarised into it.
 *
 * The line for a course that meets within the hour is marked and carries the
 * button to go in; everything else is quiet.
 */
export default function CourseRows({ courses, t, locale, showTeacher = false }) {
  if (!courses.length) {
    return <EmptyState icon={<CalendarDays className="size-4" />} title={t("admin.courses.empty")} />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th className="w-12">{t("admin.fields.level")}</th>
            <th>{t("admin.fields.course")}</th>
            {showTeacher && <th className="w-36">{t("admin.fields.teacher")}</th>}
            <th className="w-44">{t("admin.overview.nextClass")}</th>
            <th className="w-40">{t("admin.overview.progress")}</th>
            <th className="w-28">{t("admin.courses.students")}</th>
            <th className="w-32" />
          </tr>
        </thead>
        <tbody>
          {courses.map((c) => {
            const soon = c.next && c.next.state !== "past";
            const through = c.total ? Math.round((c.done / c.total) * 100) : 0;
            const seats = c.capacity ? Math.min(100, Math.round((c.active / c.capacity) * 100)) : 0;
            return (
              <tr key={c._id} className={cn(c.next?.state === "live" && "bg-red-50/50")}>
                <td>
                  <LevelBadge level={c.level} />
                </td>
                <td>
                  <Link href={`/admin/courses/${c._id}`} className="block font-medium text-ink hover:text-navy-700 hover:underline">
                    {c.title}
                  </Link>
                  <span className="mt-0.5 block truncate text-[11.5px] text-muted">
                    {scheduleText(c, t, locale) || t("admin.timetable.noSlotYet")}
                  </span>
                </td>
                {showTeacher && <td className="truncate text-[12.5px] text-muted">{c.teacher || t("admin.fields.teacherNone")}</td>}

                {/* when it next meets */}
                <td className="whitespace-nowrap">
                  {soon ? (
                    <>
                      <span className={cn("block font-medium", c.next.state === "live" ? "text-red-700" : "text-ink")}>
                        {c.next.state === "live" ? t("lessons.liveNow") : dayWord(c.next.startsAt, t, locale)}
                      </span>
                      <span className="block text-[11.5px] text-muted tabular">
                        {formatTime(c.next.startsAt, locale)} · {c.next.title}
                      </span>
                    </>
                  ) : (
                    <span className="text-muted">{t("admin.overview.nothingPlanned")}</span>
                  )}
                </td>

                {/* how far through the term */}
                <td>
                  <span className="block text-[12.5px] tabular text-ink">
                    {t("admin.overview.ofSessions", { done: c.done, total: c.total })}
                  </span>
                  <span className="mt-1 block h-1 w-full bg-canvas">
                    <span className="block h-full bg-navy-700" style={{ width: `${through}%` }} />
                  </span>
                </td>

                {/* the roster */}
                <td>
                  <span className="flex items-center gap-2">
                    <span className="tabular">{c.active}/{c.capacity}</span>
                    {c.pending > 0 && <span dir="ltr" className="badge border border-amber-700/25 bg-amber-50 text-amber-900">+{c.pending}</span>}
                  </span>
                  <span className="mt-1 block h-1 w-full bg-canvas">
                    <span className="block h-full bg-gold-500" style={{ width: `${seats}%` }} />
                  </span>
                </td>

                <td className="text-end">
                  {c.next?.state === "live" || c.next?.soon ? (
                    <Link href={c.next.href} className="btn btn-gold btn-sm">
                      <Video className="size-3.5" /> {t("classroom.startClass")}
                    </Link>
                  ) : (
                    <Link href={`/admin/courses/${c._id}`} className="btn btn-outline btn-sm">
                      <ArrowRight className="size-3.5 rtl:rotate-180" />
                    </Link>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** "Today", "Tomorrow", or the date — whichever a person would actually say. */
function dayWord(value, t, locale) {
  const day = 864e5;
  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);
  const diff = Math.floor((new Date(value).getTime() - midnight.getTime()) / day);
  if (diff === 0) return t("common.today");
  if (diff === 1) return t("common.tomorrow");
  return formatDate(value, locale, { weekday: "short", year: undefined });
}
