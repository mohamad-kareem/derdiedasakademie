import Link from "next/link";
import { Users, Layers, Wallet, FileCheck2, CalendarDays, Inbox, ArrowRight, Plus } from "lucide-react";
import { PageHeader, StatCard, Panel, EmptyState } from "@/components/ui/Blocks";
import { LevelBadge } from "@/components/ui/Badges";
import LessonItem from "@/components/portal/LessonItem";
import EnrollmentActions from "@/components/admin/EnrollmentActions";
import { requireAdmin } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Course from "@/models/Course";
import Enrollment from "@/models/Enrollment";
import Lesson from "@/models/Lesson";
import Submission from "@/models/Submission";
import Inquiry from "@/models/Inquiry";
import "@/models/Assignment";
import { formatDate, formatMoney, hoursAgo, plain } from "@/lib/utils";

export default async function AdminOverview() {
  const user = await requireAdmin();
  const { t, locale } = await getI18n();
  await connectDB();

  const [pendingCount, students, activeCount, revenueAgg, outstandingAgg, toGrade, newInquiries, pending, lessons, courses, enrollCounts, recentSubs] = await Promise.all([
    Enrollment.countDocuments({ status: "pending" }),
    User.countDocuments({ role: "student" }),
    Enrollment.countDocuments({ status: "active" }),
    Enrollment.aggregate([{ $match: { paymentStatus: "paid" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
    Enrollment.aggregate([{ $match: { paymentStatus: "unpaid", status: { $in: ["active", "completed"] } } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
    Submission.countDocuments({ status: "submitted" }),
    Inquiry.countDocuments({ status: "new" }),
    Enrollment.find({ status: "pending" }).populate("student", "name email level").populate("course", "title level").sort({ createdAt: -1 }).limit(6).lean(),
    Lesson.find({ startsAt: { $gte: hoursAgo(2) } }).populate("course", "title level meetingUrl").sort({ startsAt: 1 }).limit(6).lean(),
    Course.find({ status: "published", endDate: { $gte: new Date() } }).sort({ startDate: 1 }).limit(6).lean(),
    Enrollment.aggregate([{ $match: { status: "active" } }, { $group: { _id: "$course", n: { $sum: 1 } } }]),
    Submission.find({ status: "submitted" }).populate("student", "name").populate("assignment", "title").sort({ createdAt: -1 }).limit(5).lean(),
  ]);
  const counts = Object.fromEntries(enrollCounts.map((c) => [String(c._id), c.n]));
  const currency = courses[0]?.currency || "EUR";

  return (
    <>
      <PageHeader
        title={t("admin.overview.title", { name: user.name.split(" ")[0] })}
        description={t("admin.overview.subtitle")}
        actions={<Link href="/admin/courses?new=1" className="btn btn-primary"><Plus className="size-4" /> {t("admin.courses.new")}</Link>}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("admin.stats.students")} value={students} icon={<Users className="size-5" />} hint={t("admin.stats.activeEnrollments", { n: activeCount })} />
        <StatCard label={t("admin.stats.pending")} value={pendingCount} icon={<Layers className="size-5" />} tone="gold" hint={t("admin.stats.pendingHint")} />
        <StatCard label={t("admin.stats.revenue")} value={formatMoney(revenueAgg[0]?.total || 0, currency, locale)} icon={<Wallet className="size-5" />} tone="green" hint={t("admin.stats.outstanding", { amount: formatMoney(outstandingAgg[0]?.total || 0, currency, locale) })} />
        <StatCard label={t("admin.stats.toGrade")} value={toGrade} icon={<FileCheck2 className="size-5" />} tone={toGrade ? "red" : "green"} hint={t("admin.stats.newInquiries", { n: newInquiries })} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Panel
            title={t("admin.overview.requests")}
            action={<Link href="/admin/enrollments" className="text-xs font-semibold text-navy-700 hover:underline">{t("common.viewAll")}</Link>}
            bodyClassName="divide-y divide-line"
          >
            {pending.length ? plain(pending).map((e) => (
              <div key={e._id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">{e.student?.name} <span className="font-normal text-muted">· {e.student?.email}</span></p>
                  <p className="mt-0.5 flex items-center gap-2 text-xs text-muted"><LevelBadge level={e.course?.level} /> {e.course?.title} · {formatDate(e.createdAt, locale)}</p>
                  {e.message && <p className="mt-1 line-clamp-1 text-xs italic text-ink/70">“{e.message}”</p>}
                </div>
                <EnrollmentActions e={e} t={t} />
              </div>
            )) : <EmptyState icon={<Layers className="size-5" />} title={t("admin.overview.noRequests")} />}
          </Panel>
          <Panel title={t("admin.overview.upcoming")} bodyClassName="divide-y divide-line">
            {lessons.length ? plain(lessons).map((l) => <LessonItem key={l._id} lesson={l} t={t} locale={locale} showCourse />) : <EmptyState icon={<CalendarDays className="size-5" />} title={t("student.overview.noSessions")} />}
          </Panel>
        </div>
        <div className="space-y-6">
          <Panel title={t("admin.overview.running")} action={<Link href="/admin/courses" className="text-xs font-semibold text-navy-700 hover:underline">{t("common.viewAll")}</Link>} bodyClassName="divide-y divide-line">
            {courses.length ? plain(courses).map((c) => {
              const n = counts[c._id] || 0;
              return (
                <Link key={c._id} href={`/admin/courses/${c._id}`} className="block px-4 py-3 hover:bg-canvas/60">
                  <div className="flex items-center gap-2">
                    <LevelBadge level={c.level} />
                    <p className="flex-1 truncate text-sm font-medium text-ink">{c.title}</p>
                    <ArrowRight className="size-3.5 text-muted rtl:rotate-180" />
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-canvas"><div className="h-full rounded-full bg-navy-700" style={{ width: `${Math.min(100, (n / c.capacity) * 100)}%` }} /></div>
                    <span className="text-xs text-muted">{n}/{c.capacity}</span>
                  </div>
                </Link>
              );
            }) : <EmptyState title={t("admin.courses.empty")} />}
          </Panel>
          <Panel title={t("admin.overview.toGrade")} action={<Link href="/admin/grading" className="text-xs font-semibold text-navy-700 hover:underline">{t("common.viewAll")}</Link>} bodyClassName="divide-y divide-line">
            {recentSubs.length ? plain(recentSubs).map((s) => (
              <Link key={s._id} href="/admin/grading" className="block px-4 py-3 hover:bg-canvas/60">
                <p className="truncate text-sm font-medium text-ink">{s.assignment?.title}</p>
                <p className="text-xs text-muted">{s.student?.name} · {formatDate(s.updatedAt, locale)}</p>
              </Link>
            )) : <EmptyState icon={<FileCheck2 className="size-5" />} title={t("admin.grading.empty")} />}
          </Panel>
          {newInquiries > 0 && (
            <Link href="/admin/inquiries" className="card flex items-center gap-3 p-4 hover:border-navy-600/40">
              <span className="flex size-10 items-center justify-center rounded-lg bg-sky-50 text-sky-700"><Inbox className="size-5" /></span>
              <span className="flex-1 text-sm font-medium text-ink">{t("admin.stats.newInquiries", { n: newInquiries })}</span>
              <ArrowRight className="size-4 text-muted rtl:rotate-180" />
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
