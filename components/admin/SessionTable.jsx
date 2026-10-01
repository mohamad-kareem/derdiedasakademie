import Link from "next/link";
import { Video, BarChart3, Pencil, Trash2, Paperclip, Users, Link2, CalendarDays } from "lucide-react";
import { EmptyState } from "@/components/ui/Blocks";
import ActionButton from "@/components/ui/ActionButton";
import FormModal from "@/components/admin/FormModal";
import { LessonFields } from "@/components/admin/Fields";
import { saveLesson, deleteLesson } from "@/app/actions/admin";
import { lessonState } from "@/lib/student-data";
import { cn, formatDate, formatTime } from "@/lib/utils";

/**
 * A term's classes.
 *
 * Forty sessions listed one under another is a wall, not a list: they are all
 * called "Session 12" and none of them stands out. So the month is chosen
 * first and only that month is drawn — a dozen rows at most — and each row
 * leads with the date, because the date is the thing you are looking for. The
 * session's number follows it as a quiet note.
 *
 * The next class to be taught is marked, and everything already taught is set
 * in grey, so the present moment is visible in the list itself.
 */
export default function SessionTable({ lessons, courseId, months, month, nextId, mine, storage, builtin, attendance = {}, t, locale }) {
  if (!lessons.length && !months.length) {
    return <EmptyState icon={<CalendarDays className="size-5" />} title={t("admin.course.noSessions")} text={t("admin.course.noSessionsText")} />;
  }

  return (
    <>
      {months.length > 1 && (
        <div className="flex gap-1 overflow-x-auto border-b border-line px-3 py-2">
          {months.map((m) => (
            <Link
              key={m.key}
              href={`/admin/courses/${courseId}?tab=sessions&m=${m.key}`}
              scroll={false}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-[2px] px-2.5 py-1 text-[12.5px] font-medium",
                m.key === month ? "bg-navy-900 text-white" : "text-muted hover:bg-cream hover:text-navy-900",
              )}
            >
              {m.label}
              <span className={cn("text-[10.5px] tabular", m.key === month ? "text-white/60" : "text-muted/70")}>{m.n}</span>
            </Link>
          ))}
        </div>
      )}

      {lessons.length ? (
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-44">{t("admin.fields.startsAt")}</th>
                <th>{t("admin.fields.title")}</th>
                <th className="w-32">{t("admin.course.sessionExtras")}</th>
                <th className="w-44" />
              </tr>
            </thead>
            <tbody>
              {lessons.map((l) => {
                const state = lessonState(l);
                const past = state === "past";
                return (
                  <tr key={l._id} className={cn(state === "live" && "bg-red-50/50", past && "text-muted")}>
                    {/* the date, which is what anybody is scanning for */}
                    <td className="whitespace-nowrap">
                      <span className={cn("block font-medium", past ? "text-muted" : "text-ink")}>
                        {formatDate(l.startsAt, locale, { weekday: "short", year: undefined })}
                      </span>
                      <span className="block text-[11.5px] tabular text-muted">
                        {formatTime(l.startsAt, locale)} · {l.durationMin} {t("lessons.min")}
                      </span>
                    </td>

                    <td>
                      <span className="flex flex-wrap items-center gap-2">
                        <span className={cn("truncate", past ? "text-muted" : "font-medium text-ink")}>{l.title}</span>
                        {state === "live" && <span className="badge border border-red-700 bg-red-700 text-white">{t("lessons.liveNow")}</span>}
                        {state !== "live" && l._id === nextId && (
                          <span className="badge border border-navy-600/25 bg-navy-50 text-navy-800">{t("admin.course.nextUp")}</span>
                        )}
                      </span>
                      {l.description && <span className="mt-0.5 block line-clamp-1 text-[11.5px] text-muted">{l.description}</span>}
                    </td>

                    <td>
                      <span className="flex flex-wrap items-center gap-1.5">
                        {l.materials?.length > 0 && (
                          <span className="badge bg-gold-50 text-gold-600" title={t("admin.fields.materials")}>
                            <Link2 className="size-3" /> {l.materials.length}
                          </span>
                        )}
                        {l.attachments?.length > 0 && (
                          <span className="badge bg-gold-50 text-gold-600" title={t("admin.fields.files")}>
                            <Paperclip className="size-3" /> {l.attachments.length}
                          </span>
                        )}
                        {attendance[l._id] > 0 && (
                          <span className="badge bg-emerald-50 text-emerald-700" title={t("classroom.attendance")}>
                            <Users className="size-3" /> {attendance[l._id]}
                          </span>
                        )}
                      </span>
                    </td>

                    <td>
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Only the class that is about to happen carries the
                            button; a row of them three weeks out is just noise. */}
                        {builtin && !past && (state === "live" || l._id === nextId) && (
                          <Link href={`/classroom/${l._id}`} className="btn btn-gold btn-sm">
                            <Video className="size-3.5" /> {t("classroom.startClass")}
                          </Link>
                        )}
                        <Link href={`/admin/courses/${courseId}/sessions/${l._id}`} className="btn btn-outline btn-sm" title={t("classroom.sessionReport")}>
                          <BarChart3 className="size-3.5" />
                        </Link>
                        {mine && (
                          <FormModal
                            trigger={<Pencil className="size-3.5" />}
                            triggerClassName="btn-outline btn-sm"
                            title={t("admin.course.editSession")}
                            action={saveLesson.bind(null, courseId, l._id)}
                            size="lg"
                          >
                            <LessonFields t={t} lesson={l} courseId={courseId} storage={storage} />
                          </FormModal>
                        )}
                        {mine && (
                          <ActionButton action={deleteLesson.bind(null, l._id)} confirm title={t("common.delete")}>
                            <Trash2 className="size-3.5" />
                          </ActionButton>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState icon={<CalendarDays className="size-5" />} title={t("admin.course.noSessionsThisMonth")} />
      )}
    </>
  );
}
