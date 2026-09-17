import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Plus, Pencil, Trash2, ExternalLink, Video, PlayCircle, FileText, ClipboardList, Megaphone, CalendarDays, Users, Pin, UserPlus, Eye } from "lucide-react";
import { Panel, EmptyState } from "@/components/ui/Blocks";
import { LevelBadge, StatusBadge } from "@/components/ui/Badges";
import ActionButton from "@/components/ui/ActionButton";
import ActionForm, { SubmitButton } from "@/components/ui/ActionForm";
import FormModal from "@/components/admin/FormModal";
import EnrollmentActions from "@/components/admin/EnrollmentActions";
import InlineCourseForm from "@/components/admin/InlineCourseForm";
import { LessonFields, AssignmentFields, AnnouncementFields, CourseFields } from "@/components/admin/Fields";
import { requireAdmin } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { isId } from "@/lib/validate";
import connectDB from "@/lib/mongodb";
import Course from "@/models/Course";
import Enrollment from "@/models/Enrollment";
import Lesson from "@/models/Lesson";
import Assignment from "@/models/Assignment";
import Submission from "@/models/Submission";
import Announcement from "@/models/Announcement";
import "@/models/User";
import {
  saveLesson, deleteLesson, saveAssignment, deleteAssignment, saveAnnouncement, deleteAnnouncement, addStudentToCourse, deleteCourse,
} from "@/app/actions/admin";
import { cn, formatDate, formatDateTime, formatMoney, formatTime, nowMs, plain } from "@/lib/utils";

const TABS = ["sessions", "students", "assignments", "announcements", "settings"];

export default async function AdminCoursePage({ params, searchParams }) {
  const { id } = await params;
  const { tab: rawTab } = await searchParams;
  if (!isId(id)) notFound();
  await requireAdmin();
  const { t, locale } = await getI18n();
  await connectDB();
  const tab = TABS.includes(rawTab) ? rawTab : "sessions";

  const courseDoc = await Course.findById(id).lean();
  if (!courseDoc) notFound();
  const course = plain(courseDoc);

  const [lessons, enrollments, assignments, submissions, announcements] = plain(
    await Promise.all([
      Lesson.find({ course: id }).sort({ startsAt: 1 }).lean(),
      Enrollment.find({ course: id }).populate("student", "name email phone level").sort({ status: 1, createdAt: -1 }).lean(),
      Assignment.find({ course: id }).sort({ dueDate: 1, createdAt: -1 }).lean(),
      Submission.find({ course: id }).select("assignment status").lean(),
      Announcement.find({ course: id }).sort({ pinned: -1, createdAt: -1 }).lean(),
    ]),
  );
  const active = enrollments.filter((e) => e.status === "active");
  const pendingCount = enrollments.filter((e) => e.status === "pending").length;
  const now = nowMs();

  const tabCount = { sessions: lessons.length, students: active.length, assignments: assignments.length, announcements: announcements.length };

  return (
    <>
      <Link href="/admin/courses" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-navy-900">
        <ArrowLeft className="size-4 rtl:rotate-180" /> {t("admin.nav.courses")}
      </Link>

      <div className="card mb-6 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <LevelBadge level={course.level} />
              <StatusBadge status={course.status} label={t(`status.${course.status}`)} />
              <span className="text-xs text-muted">{t(`format.${course.format}`)}</span>
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-navy-900">{course.title}</h1>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
              <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-4" />{formatDate(course.startDate, locale)} – {formatDate(course.endDate, locale)}</span>
              <span className="inline-flex items-center gap-1.5"><Users className="size-4" />{active.length}/{course.capacity}{pendingCount > 0 && ` · ${pendingCount} ${t("status.pending")}`}</span>
              <span>{formatMoney(course.price, course.currency, locale)}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {course.meetingUrl && <a href={course.meetingUrl} target="_blank" rel="noopener noreferrer" className="btn btn-gold"><Video className="size-4" /> {t("student.room.classroom")}</a>}
            {course.status === "published" && <Link href={`/courses/${course._id}`} className="btn btn-outline"><Eye className="size-4" /> {t("admin.courses.viewPublic")}</Link>}
          </div>
        </div>
        <div className="-mb-5 mt-5 flex gap-1 overflow-x-auto border-t border-line pt-1">
          {TABS.map((k) => (
            <Link key={k} href={`/admin/courses/${id}?tab=${k}`} className={cn("-mb-px whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium", tab === k ? "border-navy-900 text-navy-900" : "border-transparent text-muted hover:text-ink")}>
              {t(`admin.course.tabs.${k}`)}
              {tabCount[k] !== undefined && <span className="ms-1.5 rounded-full bg-canvas px-1.5 text-[11px] text-muted">{tabCount[k]}</span>}
            </Link>
          ))}
        </div>
      </div>

      {tab === "sessions" && (
        <Panel
          title={t("admin.course.sessionsTitle")}
          action={
            <FormModal trigger={<><Plus className="size-3.5" /> {t("admin.course.addSession")}</>} triggerClassName="btn-primary btn-sm" title={t("admin.course.addSession")} action={saveLesson.bind(null, id, null)} size="lg">
              <LessonFields t={t} lesson={{ durationMin: 90 }} />
            </FormModal>
          }
          bodyClassName="divide-y divide-line"
        >
          {lessons.length ? lessons.map((l, i) => {
            const past = new Date(l.startsAt).getTime() + l.durationMin * 60000 < now;
            return (
              <div key={l._id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
                <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold", past ? "bg-canvas text-muted" : "bg-navy-900 text-white")}>{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">{l.title}</p>
                  <p className="text-xs text-muted">{formatDateTime(l.startsAt, locale)} · {l.durationMin} {t("lessons.min")}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {l.recordingUrl && <a href={l.recordingUrl} target="_blank" rel="noopener noreferrer" className="badge bg-navy-50 text-navy-700"><PlayCircle className="size-3" /> {t("lessons.recording")}</a>}
                    {l.materials?.map((m, j) => <a key={j} href={m.url} target="_blank" rel="noopener noreferrer" className="badge bg-gold-50 text-gold-600"><FileText className="size-3" /> {m.title}</a>)}
                    {past && !l.recordingUrl && <span className="badge bg-canvas text-muted">{t("admin.course.noRecording")}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <FormModal trigger={<Pencil className="size-3.5" />} triggerClassName="btn-outline btn-sm" title={t("admin.course.editSession")} action={saveLesson.bind(null, id, l._id)} size="lg">
                    <LessonFields t={t} lesson={l} />
                  </FormModal>
                  <ActionButton action={deleteLesson.bind(null, l._id)} confirm title={t("common.delete")}><Trash2 className="size-3.5" /></ActionButton>
                </div>
              </div>
            );
          }) : <EmptyState icon={<CalendarDays className="size-5" />} title={t("admin.course.noSessions")} text={t("admin.course.noSessionsText")} />}
        </Panel>
      )}

      {tab === "students" && (
        <div className="grid gap-6 xl:grid-cols-3">
          <Panel title={t("admin.course.roster")} className="xl:col-span-2" bodyClassName="overflow-x-auto">
            {enrollments.length ? (
              <table className="data-table">
                <thead><tr><th>{t("admin.students.student")}</th><th>{t("admin.fields.status")}</th><th>{t("admin.enroll.payment")}</th><th /></tr></thead>
                <tbody>
                  {enrollments.filter((e) => e.student).map((e) => (
                    <tr key={e._id}>
                      <td>
                        <Link href={`/admin/students/${e.student._id}`} className="font-medium text-ink hover:underline">{e.student.name}</Link>
                        <p className="text-xs text-muted">{e.student.email}</p>
                      </td>
                      <td><StatusBadge status={e.status} label={t(`status.${e.status}`)} /></td>
                      <td><StatusBadge status={e.paymentStatus} label={t(`payment.${e.paymentStatus}`)} /></td>
                      <td><EnrollmentActions e={e} t={t} compact /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <EmptyState icon={<Users className="size-5" />} title={t("admin.course.noStudents")} />}
          </Panel>
          <Panel title={<span className="inline-flex items-center gap-2"><UserPlus className="size-4" /> {t("admin.course.addStudent")}</span>} bodyClassName="p-4">
            <ActionForm action={addStudentToCourse.bind(null, id)} resetOnSuccess className="space-y-3">
              <label className="block">
                <span className="label">{t("admin.course.studentEmail")}</span>
                <input name="email" type="email" required className="input" dir="ltr" />
              </label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="paid" className="size-4 accent-navy-900" /> {t("admin.enroll.alreadyPaid")}</label>
              <p className="text-xs text-muted">{t("admin.course.addStudentHint")}</p>
              <SubmitButton className="w-full">{t("admin.course.addStudent")}</SubmitButton>
            </ActionForm>
          </Panel>
        </div>
      )}

      {tab === "assignments" && (
        <Panel
          title={t("admin.course.assignmentsTitle")}
          action={
            <FormModal trigger={<><Plus className="size-3.5" /> {t("admin.course.addAssignment")}</>} triggerClassName="btn-primary btn-sm" title={t("admin.course.addAssignment")} action={saveAssignment.bind(null, id, null)} size="lg">
              <AssignmentFields t={t} />
            </FormModal>
          }
          bodyClassName="divide-y divide-line"
        >
          {assignments.length ? assignments.map((a) => {
            const subs = submissions.filter((s) => s.assignment === a._id);
            const ungraded = subs.filter((s) => s.status === "submitted").length;
            return (
              <div key={a._id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gold-50 text-gold-600"><ClipboardList className="size-4" /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">{a.title}</p>
                  <p className="text-xs text-muted">
                    {a.dueDate ? t("assignments.due", { date: formatDateTime(a.dueDate, locale) }) : t("assignments.noDue")} · {t("admin.course.submissionsCount", { n: subs.length, total: active.length })}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  {ungraded > 0 && <Link href={`/admin/grading?course=${id}`} className="btn btn-gold btn-sm">{t("admin.course.gradeN", { n: ungraded })}</Link>}
                  <FormModal trigger={<Pencil className="size-3.5" />} triggerClassName="btn-outline btn-sm" title={t("admin.course.editAssignment")} action={saveAssignment.bind(null, id, a._id)} size="lg">
                    <AssignmentFields t={t} assignment={a} />
                  </FormModal>
                  <ActionButton action={deleteAssignment.bind(null, a._id)} confirm title={t("common.delete")}><Trash2 className="size-3.5" /></ActionButton>
                </div>
              </div>
            );
          }) : <EmptyState icon={<ClipboardList className="size-5" />} title={t("student.room.noAssignments")} />}
        </Panel>
      )}

      {tab === "announcements" && (
        <Panel
          title={t("admin.nav.announcements")}
          action={
            <FormModal trigger={<><Plus className="size-3.5" /> {t("admin.announcements.new")}</>} triggerClassName="btn-primary btn-sm" title={t("admin.announcements.new")} action={saveAnnouncement.bind(null, null)}>
              <AnnouncementFields t={t} fixedCourseId={id} />
            </FormModal>
          }
          bodyClassName="divide-y divide-line"
        >
          {announcements.length ? announcements.map((a) => (
            <div key={a._id} className="flex gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">{a.pinned && <Pin className="size-3.5 text-gold-500" />}{a.title}</p>
                <p className="text-[11px] text-muted">{formatDate(a.createdAt, locale)} · {formatTime(a.createdAt, locale)}</p>
                {a.body && <p className="prose-text mt-1 text-[13px]">{a.body}</p>}
              </div>
              <div className="flex items-start gap-1.5">
                <FormModal trigger={<Pencil className="size-3.5" />} triggerClassName="btn-outline btn-sm" title={t("common.edit")} action={saveAnnouncement.bind(null, a._id)}>
                  <AnnouncementFields t={t} announcement={a} fixedCourseId={id} />
                </FormModal>
                <ActionButton action={deleteAnnouncement.bind(null, a._id)} confirm><Trash2 className="size-3.5" /></ActionButton>
              </div>
            </div>
          )) : <EmptyState icon={<Megaphone className="size-5" />} title={t("student.overview.noAnnouncements")} />}
        </Panel>
      )}

      {tab === "settings" && (
        <div className="grid gap-6 xl:grid-cols-3">
          <Panel title={t("admin.course.details")} className="xl:col-span-2" bodyClassName="p-5">
            <InlineCourseForm courseId={id}>
              <CourseFields t={t} course={course} />
            </InlineCourseForm>
          </Panel>
          <Panel title={t("admin.course.dangerZone")} bodyClassName="space-y-3 p-5">
            <p className="text-sm text-muted">{t("admin.course.deleteHint")}</p>
            <ActionButton action={deleteCourse.bind(null, id)} confirm className="btn-danger"><Trash2 className="size-3.5" /> {t("admin.course.delete")}</ActionButton>
            {course.meetingUrl && (
              <p className="flex items-center gap-1.5 break-all pt-3 text-xs text-muted"><ExternalLink className="size-3.5 shrink-0" /> {course.meetingUrl}</p>
            )}
          </Panel>
        </div>
      )}
    </>
  );
}

