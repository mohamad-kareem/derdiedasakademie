import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Video, CalendarDays, Clock, Award, ClipboardList, Megaphone, Pin, History } from "lucide-react";
import { Panel, EmptyState } from "@/components/ui/Blocks";
import { LevelBadge, StatusBadge } from "@/components/ui/Badges";
import LessonItem from "@/components/portal/LessonItem";
import AssignmentRow from "@/components/portal/AssignmentRow";
import { requireStudent } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { isId } from "@/lib/validate";
import connectDB from "@/lib/mongodb";
import Enrollment from "@/models/Enrollment";
import Lesson from "@/models/Lesson";
import "@/models/Course";
import { getMyAssignments, getAnnouncements, lessonState } from "@/lib/student-data";
import { formatDate, plain } from "@/lib/utils";

export default async function CourseRoomPage({ params }) {
  const { id } = await params;
  if (!isId(id)) notFound();
  const user = await requireStudent();
  const { t, locale } = await getI18n();
  await connectDB();

  const enrollment = plain(await Enrollment.findOne({ student: user.id, course: id, status: { $in: ["active", "completed"] } }).populate("course").lean());
  if (!enrollment?.course) notFound();
  const course = enrollment.course;

  const [lessonsRaw, assignments, announcements] = await Promise.all([
    Lesson.find({ course: id }).sort({ startsAt: 1 }).lean(),
    getMyAssignments(user.id, [course._id], locale),
    getAnnouncements([course._id], 20).then((list) => list.filter((a) => a.course)),
  ]);
  const lessons = plain(lessonsRaw).map((l) => ({ ...l, course }));
  const upcoming = lessons.filter((l) => lessonState(l) !== "past");
  const past = lessons.filter((l) => lessonState(l) === "past").reverse();
  const progress = lessons.length ? Math.round((past.length / lessons.length) * 100) : 0;
  const isActive = enrollment.status === "active";

  return (
    <>
      <Link href="/dashboard/courses" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-navy-900">
        <ArrowLeft className="size-4 rtl:rotate-180" /> {t("student.nav.courses")}
      </Link>

      <div className="card overflow-hidden">
        <div className="relative bg-navy-900 p-6 text-white">
          <div className="flag-stripe absolute inset-x-0 top-0 h-1" />
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <LevelBadge level={course.level} />
                <StatusBadge status={enrollment.status} label={t(`status.${enrollment.status}`)} className="bg-white/10 text-white" />
              </div>
              <h1 className="mt-3 text-2xl font-semibold tracking-tight">{course.title}</h1>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-white/65">
                <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-4" /> {formatDate(course.startDate, locale)} – {formatDate(course.endDate, locale)}</span>
                {course.schedule && <span className="inline-flex items-center gap-1.5"><Clock className="size-4" /> {course.schedule}</span>}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {isActive && course.meetingUrl && (
                <a href={course.meetingUrl} target="_blank" rel="noopener noreferrer" className="btn btn-gold"><Video className="size-4" /> {t("student.room.classroom")}</a>
              )}
              {enrollment.status === "completed" && (
                <Link href={`/certificate/${enrollment._id}`} className="btn btn-light"><Award className="size-4" /> {t("certificate.view")}</Link>
              )}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 divide-x divide-line rtl:divide-x-reverse">
          <div className="p-4">
            <p className="text-xs text-muted">{t("student.room.progress")}</p>
            <div className="mt-2 flex items-center gap-3">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-canvas"><div className="h-full rounded-full bg-gold-500" style={{ width: `${progress}%` }} /></div>
              <span className="text-sm font-semibold text-navy-900">{progress}%</span>
            </div>
          </div>
          <div className="p-4">
            <p className="text-xs text-muted">{t("student.room.sessions")}</p>
            <p className="mt-1 text-sm font-semibold text-navy-900">{past.length} / {lessons.length}</p>
          </div>
          <div className="p-4">
            <p className="text-xs text-muted">{t("student.room.assignments")}</p>
            <p className="mt-1 text-sm font-semibold text-navy-900">{assignments.filter((a) => a.submission).length} / {assignments.length}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Panel title={t("student.room.upcoming")} bodyClassName="divide-y divide-line">
            {upcoming.length ? upcoming.map((l) => <LessonItem key={l._id} lesson={l} t={t} locale={locale} canJoin={isActive} />) : <EmptyState icon={<CalendarDays className="size-5" />} title={t("student.overview.noSessions")} />}
          </Panel>
          <Panel title={t("student.room.assignments")} bodyClassName="divide-y divide-line">
            {assignments.length ? assignments.map((a) => <AssignmentRow key={a._id} assignment={a} showCourse={false} />) : <EmptyState icon={<ClipboardList className="size-5" />} title={t("student.room.noAssignments")} />}
          </Panel>
          {past.length > 0 && (
            <Panel title={<span className="inline-flex items-center gap-2"><History className="size-4" /> {t("student.room.past")}</span>} bodyClassName="divide-y divide-line">
              {past.map((l) => <LessonItem key={l._id} lesson={l} t={t} locale={locale} />)}
            </Panel>
          )}
        </div>
        <div className="space-y-6">
          <Panel title={t("student.overview.announcements")} bodyClassName="divide-y divide-line">
            {announcements.length ? announcements.map((a) => (
              <div key={a._id} className="px-4 py-3">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">{a.pinned && <Pin className="size-3.5 text-gold-500" />}{a.title}</p>
                <p className="mt-0.5 text-[11px] text-muted">{formatDate(a.createdAt, locale)}</p>
                {a.body && <p className="prose-text mt-1.5 text-[13px]">{a.body}</p>}
              </div>
            )) : <EmptyState icon={<Megaphone className="size-5" />} title={t("student.overview.noAnnouncements")} />}
          </Panel>
          {course.description && (
            <Panel title={t("courses.about")} bodyClassName="p-4">
              <p className="prose-text text-[13px]">{course.description}</p>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
