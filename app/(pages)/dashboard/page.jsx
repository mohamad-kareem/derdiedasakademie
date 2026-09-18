import Link from "next/link";
import { BookOpen, CalendarDays, ClipboardList, Megaphone, ArrowRight, Hourglass, Star, Pin } from "lucide-react";
import { PageHeader, StatCard, Panel, EmptyState } from "@/components/ui/Blocks";
import LessonItem from "@/components/portal/LessonItem";
import AssignmentRow from "@/components/portal/AssignmentRow";
import AttachmentList from "@/components/files/AttachmentList";
import { LevelBadge } from "@/components/ui/Badges";
import { requireStudent } from "@/lib/auth";
import { isStorageConfigured } from "@/lib/storage";
import { getI18n } from "@/lib/i18n/server";
import { getMyEnrollments, accessibleCourseIds, getMyAssignments, getUpcomingLessons, getAnnouncements } from "@/lib/student-data";
import { formatDate } from "@/lib/utils";

export default async function StudentOverview() {
  const user = await requireStudent();
  const { t, locale } = await getI18n();
  const enrollments = await getMyEnrollments(user.id);
  const activeIds = enrollments.filter((e) => e.status === "active").map((e) => e.course._id);
  const ids = accessibleCourseIds(enrollments);
  const [lessons, assignments, announcements] = await Promise.all([
    getUpcomingLessons(activeIds, 5),
    getMyAssignments(user.id, ids, locale),
    getAnnouncements(ids, 4),
  ]);
  const todo = assignments.filter((a) => a.state === "todo" || a.state === "missing");
  const graded = assignments.filter((a) => a.state === "graded");
  const avg = graded.length
    ? Math.round(graded.reduce((sum, a) => sum + (a.submission.grade / a.maxPoints) * 100, 0) / graded.length)
    : null;
  const pending = enrollments.filter((e) => e.status === "pending");
  const firstName = user.name.split(" ")[0];

  return (
    <>
      <PageHeader
        title={t("student.overview.greeting", { name: firstName })}
        description={t("student.overview.subtitle")}
        actions={<Link href="/courses" className="btn btn-primary">{t("student.nav.browse")}</Link>}
      />

      {pending.length > 0 && (
        <div className="mb-6 flex items-start gap-3 rounded-[3px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <Hourglass className="mt-0.5 size-4 shrink-0" />
          <p>{t("student.overview.pendingNotice", { courses: pending.map((e) => e.course.title).join(", ") })}</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("student.stats.activeCourses")} value={activeIds.length} icon={<BookOpen className="size-5" />} />
        <StatCard label={t("student.stats.upcoming")} value={lessons.length} icon={<CalendarDays className="size-5" />} tone="gold" />
        <StatCard label={t("student.stats.todo")} value={todo.length} icon={<ClipboardList className="size-5" />} tone={todo.length ? "red" : "green"} />
        <StatCard label={t("student.stats.average")} value={avg === null ? "—" : `${avg}%`} icon={<Star className="size-5" />} tone="green" />
      </div>

      {enrollments.length === 0 ? (
        <div className="card mt-6">
          <EmptyState
            icon={<BookOpen className="size-5" />}
            title={t("student.overview.noCoursesTitle")}
            text={t("student.overview.noCoursesText")}
            action={<Link href="/courses" className="btn btn-primary">{t("student.nav.browse")}</Link>}
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-2">
            <Panel title={t("student.overview.nextSessions")} bodyClassName="divide-y divide-line">
              {lessons.length ? (
                lessons.map((l) => <LessonItem key={l._id} lesson={l} t={t} locale={locale} showCourse />)
              ) : (
                <EmptyState icon={<CalendarDays className="size-5" />} title={t("student.overview.noSessions")} />
              )}
            </Panel>
            <Panel
              title={t("student.overview.todo")}
              action={<Link href="/dashboard/assignments" className="text-xs font-semibold text-navy-700 hover:underline">{t("common.viewAll")}</Link>}
              bodyClassName="divide-y divide-line"
            >
              {todo.length ? (
                todo.slice(0, 4).map((a) => <AssignmentRow key={a._id} assignment={a} storage={isStorageConfigured()} />)
              ) : (
                <EmptyState icon={<ClipboardList className="size-5" />} title={t("student.overview.allDone")} />
              )}
            </Panel>
          </div>
          <div className="space-y-6">
            <Panel title={t("student.overview.myCourses")} bodyClassName="divide-y divide-line">
              {enrollments.filter((e) => e.status !== "rejected" && e.status !== "cancelled").map((e) => (
                <Link key={e._id} href={e.status === "pending" ? "/dashboard/courses" : `/dashboard/courses/${e.course._id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-canvas/60">
                  <LevelBadge level={e.course.level} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{e.course.title}</p>
                    <p className="text-xs text-muted">{t(`status.${e.status}`)} · {formatDate(e.course.startDate, locale)}</p>
                  </div>
                  <ArrowRight className="size-4 text-muted rtl:rotate-180" />
                </Link>
              ))}
            </Panel>
            <Panel title={t("student.overview.announcements")} bodyClassName="divide-y divide-line">
              {announcements.length ? (
                announcements.map((a) => (
                  <div key={a._id} className="px-4 py-3">
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                      {a.pinned && <Pin className="size-3.5 text-gold-500" />} {a.title}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted">{a.course ? `${a.course.level} · ${a.course.title}` : t("announcements.everyone")} · {formatDate(a.createdAt, locale)}</p>
                    {a.body && <p className="prose-text mt-1.5 line-clamp-3 text-[13px]">{a.body}</p>}
                    <AttachmentList files={a.attachments} t={t} dense className="mt-2" />
                  </div>
                ))
              ) : (
                <EmptyState icon={<Megaphone className="size-5" />} title={t("student.overview.noAnnouncements")} />
              )}
            </Panel>
          </div>
        </div>
      )}
    </>
  );
}
