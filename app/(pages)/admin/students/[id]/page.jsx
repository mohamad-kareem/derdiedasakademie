import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, Phone, CalendarDays, Layers, ClipboardList } from "lucide-react";
import { Panel, EmptyState } from "@/components/ui/Blocks";
import { LevelBadge, StatusBadge } from "@/components/ui/Badges";
import EnrollmentActions from "@/components/admin/EnrollmentActions";
import StudentEditForm from "@/components/admin/StudentEditForm";
import { requireAdmin } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { isId } from "@/lib/validate";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Enrollment from "@/models/Enrollment";
import Submission from "@/models/Submission";
import "@/models/Course";
import "@/models/Assignment";
import { formatDate, formatMoney, initials, plain } from "@/lib/utils";

export default async function StudentDetailPage({ params }) {
  const { id } = await params;
  if (!isId(id)) notFound();
  await requireAdmin();
  const { t, locale } = await getI18n();
  await connectDB();

  const student = plain(await User.findOne({ _id: id, role: "student" }).lean());
  if (!student) notFound();
  const [enrollments, submissions] = plain(
    await Promise.all([
      Enrollment.find({ student: id }).populate("course", "title level currency").sort({ createdAt: -1 }).lean(),
      Submission.find({ student: id }).populate("assignment", "title maxPoints").populate("course", "title level").sort({ createdAt: -1 }).limit(50).lean(),
    ]),
  );
  const graded = submissions.filter((s) => s.status === "graded" && s.assignment);
  const avg = graded.length ? Math.round(graded.reduce((a, s) => a + (s.grade / s.assignment.maxPoints) * 100, 0) / graded.length) : null;

  return (
    <>
      <Link href="/admin/students" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-navy-900">
        <ArrowLeft className="size-4 rtl:rotate-180" /> {t("admin.nav.students")}
      </Link>
      <div className="card mb-6 flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-[2px] bg-navy-900 text-lg font-semibold text-white">{initials(student.name)}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold text-navy-900">{student.name}</h1>
            <LevelBadge level={student.level} />
            {!student.isActive && <StatusBadge status="rejected" label={t("admin.students.disabled")} />}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
            <a href={`mailto:${student.email}`} className="inline-flex items-center gap-1.5 hover:text-navy-900"><Mail className="size-4" />{student.email}</a>
            {student.phone && <span className="inline-flex items-center gap-1.5" dir="ltr"><Phone className="size-4" />{student.phone}</span>}
            <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-4" />{t("admin.students.joined")} {formatDate(student.createdAt, locale)}</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-6 text-center">
          <div><p className="text-2xl font-semibold text-navy-900">{enrollments.filter((e) => e.status === "active").length}</p><p className="text-xs text-muted">{t("admin.students.activeCourses")}</p></div>
          <div><p className="text-2xl font-semibold text-navy-900">{avg === null ? "—" : `${avg}%`}</p><p className="text-xs text-muted">{t("student.stats.average")}</p></div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Panel title={t("admin.students.enrollments")} bodyClassName="divide-y divide-line">
            {enrollments.filter((e) => e.course).length ? enrollments.filter((e) => e.course).map((e) => (
              <div key={e._id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <Link href={`/admin/courses/${e.course._id}?tab=students`} className="flex items-center gap-2 text-sm font-medium text-ink hover:underline"><LevelBadge level={e.course.level} /> {e.course.title}</Link>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                    <StatusBadge status={e.status} label={t(`status.${e.status}`)} />
                    <StatusBadge status={e.paymentStatus} label={t(`payment.${e.paymentStatus}`)} />
                    <span>{formatMoney(e.amount, e.course.currency, locale)} · {formatDate(e.createdAt, locale)}</span>
                  </div>
                </div>
                <EnrollmentActions e={e} t={t} compact />
              </div>
            )) : <EmptyState icon={<Layers className="size-5" />} title={t("admin.students.noEnrollments")} />}
          </Panel>
          <Panel title={t("admin.students.submissions")} bodyClassName="divide-y divide-line">
            {submissions.filter((s) => s.assignment).length ? submissions.filter((s) => s.assignment).map((s) => (
              <div key={s._id} className="flex items-center gap-3 px-4 py-3">
                <ClipboardList className="size-4 shrink-0 text-gold-500" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{s.assignment.title}</p>
                  <p className="text-xs text-muted">{s.course?.level} · {s.course?.title} · {formatDate(s.updatedAt, locale)}</p>
                </div>
                {s.status === "graded" ? <span className="text-sm font-semibold text-navy-900" dir="ltr">{s.grade}/{s.assignment.maxPoints}</span> : <Link href="/admin/grading" className="btn btn-gold btn-sm">{t("admin.grading.grade")}</Link>}
              </div>
            )) : <EmptyState icon={<ClipboardList className="size-5" />} title={t("admin.grading.none")} />}
          </Panel>
        </div>
        <Panel title={t("admin.students.edit")} bodyClassName="p-4">
          <StudentEditForm student={student} />
        </Panel>
      </div>
    </>
  );
}
