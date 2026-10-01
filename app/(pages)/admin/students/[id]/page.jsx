import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, Phone, CalendarDays, Layers, ClipboardList } from "lucide-react";
import { Panel, EmptyState, StatRow } from "@/components/ui/Blocks";
import { LevelBadge, StatusBadge } from "@/components/ui/Badges";
import EnrollmentActions from "@/components/admin/EnrollmentActions";
import StudentProfileActions from "@/components/admin/StudentProfileActions";
import { paymentBalance } from "@/lib/installments";
import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/roles";
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
  const viewer = await requireStaff();
  const money = can(viewer, "finance.view");
  const decide = can(viewer, "enrollments.decide");
  const manage = can(viewer, "students.manage");
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
  const validEnrollments = enrollments.filter((e) => e.course);
  const balances = {};
  if (money) for (const e of validEnrollments.filter((e) => ["pending", "active", "completed"].includes(e.status))) {
    const remaining = paymentBalance(e).remaining;
    if (remaining > 0) balances[e.course.currency] = (balances[e.course.currency] || 0) + remaining;
  }

  return (
    <>
      <Link href="/admin/students" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-navy-900">
        <ArrowLeft className="size-4 rtl:rotate-180" /> {t("admin.nav.students")}
      </Link>
      <div className="mb-5 flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-start">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-[2px] bg-navy-900 text-lg font-semibold text-white">{initials(student.name)}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold text-navy-900">{student.name}</h1>
            <LevelBadge level={student.level} />
            {!student.isActive && <StatusBadge status="rejected" label={t("admin.students.disabled")} />}
            {student.isBlocked && <StatusBadge status="rejected" label={t("blocking.blocked")} />}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
            <a href={`mailto:${student.email}`} className="inline-flex items-center gap-1.5 hover:text-navy-900"><Mail className="size-4" />{student.email}</a>
            {student.phone && <span className="inline-flex items-center gap-1.5" dir="ltr"><Phone className="size-4" />{student.phone}</span>}
            <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-4" />{t("admin.students.joined")} {formatDate(student.createdAt, locale)}</span>
          </div>
        </div>
        {manage && <StudentProfileActions student={student} />}
      </div>

      <StatRow items={[
        { label: t("admin.students.activeCourses"), value: validEnrollments.filter((e) => e.status === "active").length },
        { label: t("status.completed"), value: validEnrollments.filter((e) => e.status === "completed").length },
        { label: t("admin.students.submissions"), value: submissions.length },
        { label: t("student.stats.average"), value: avg === null ? "—" : `${avg}%` },
      ]} />
      <div className="mt-5 grid items-start gap-5 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Panel title={t("admin.students.enrollments")} bodyClassName="divide-y divide-line">
            {validEnrollments.length ? validEnrollments.map((e) => (
              <div key={e._id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <Link href={`/admin/courses/${e.course._id}?tab=students`} className="flex items-center gap-2 text-sm font-medium text-ink hover:underline"><LevelBadge level={e.course.level} /> {e.course.title}</Link>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                    <StatusBadge status={e.status} label={t(`status.${e.status}`)} />
                    {money && <StatusBadge status={e.paymentStatus} label={t(`payment.${e.paymentStatus}`)} />}
                    <span>{money ? `${formatMoney(e.amount, e.course.currency, locale)} · ` : ""}{formatDate(e.createdAt, locale)}</span>
                  </div>
                  {money && e.paymentStatus === "partial" && <p className="mt-2 text-xs text-muted">{t("installments.remaining")}: <span className="font-medium text-ink">{formatMoney(paymentBalance(e).remaining, e.course.currency, locale)}</span> · {t("installments.dueDate")}: {e.paymentDueDate}</p>}
                </div>
                {decide && <EnrollmentActions e={e} t={t} compact />}
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
        <aside className="space-y-5">
          <Panel title={t("profile.details")} bodyClassName="p-4">
            <dl className="space-y-4 text-sm">
              <div><dt className="text-xs text-muted">{t("form.currentLevel")}</dt><dd className="mt-1 font-medium">{student.level === "unknown" ? t("form.levelUnknown") : student.level}</dd></div>
              {student.country && <div><dt className="text-xs text-muted">{t("form.country")}</dt><dd className="mt-1 font-medium">{student.country}</dd></div>}
              <div><dt className="text-xs text-muted">{t("admin.students.joined")}</dt><dd className="mt-1 font-medium">{formatDate(student.createdAt, locale)}</dd></div>
            </dl>
          </Panel>
          {money && <Panel title={t("installments.remaining")} bodyClassName="p-4">
            {Object.keys(balances).length ? Object.entries(balances).map(([currency, amount]) => <p key={currency} className="text-xl font-semibold text-navy-900">{formatMoney(amount, currency, locale)}</p>) : <StatusBadge status="paid" label={t("payment.paid")} />}
          </Panel>}
          {manage && student.adminNote && <Panel title={t("admin.students.note")} bodyClassName="p-4"><p className="whitespace-pre-wrap break-words text-sm text-muted">{student.adminNote}</p></Panel>}
        </aside>
      </div>
    </>
  );
}
