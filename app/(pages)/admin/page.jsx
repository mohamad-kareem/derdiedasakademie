import Link from "next/link";
import { Users, Layers, Wallet, FileCheck2, CalendarDays, Inbox, Plus } from "lucide-react";
import { PageHeader, StatCard, Panel, EmptyState, Breadcrumb } from "@/components/ui/Blocks";
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
    Lesson.find({ startsAt: { $gte: hoursAgo(2) } }).populate("course", "title level meetingUrl classroom").sort({ startsAt: 1 }).limit(6).lean(),
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
        actions={
          <Link href="/admin/courses?new=1" className="btn btn-primary">
            <Plus className="size-3.5" /> {t("admin.courses.new")}
          </Link>
        }
      >
        <Breadcrumb trail={[t("admin.portal"), t("admin.nav.overview")]} />
      </PageHeader>

      {/* ------------------------------------------------------- key figures */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("admin.stats.students")} value={students} icon={<Users />} hint={t("admin.stats.activeEnrollments", { n: activeCount })} />
        <StatCard label={t("admin.stats.pending")} value={pendingCount} icon={<Layers />} tone="gold" hint={t("admin.stats.pendingHint")} />
        <StatCard
          label={t("admin.stats.revenue")}
          value={formatMoney(revenueAgg[0]?.total || 0, currency, locale)}
          icon={<Wallet />}
          tone="green"
          hint={t("admin.stats.outstanding", { amount: formatMoney(outstandingAgg[0]?.total || 0, currency, locale) })}
        />
        <StatCard
          label={t("admin.stats.toGrade")}
          value={toGrade}
          icon={<FileCheck2 />}
          tone={toGrade ? "red" : "green"}
          hint={t("admin.stats.newInquiries", { n: newInquiries })}
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          {/* --------------------------------------------- enrolment requests */}
          <Panel
            title={t("admin.overview.requests")}
            action={
              <Link href="/admin/enrollments" className="text-[11.5px] font-semibold text-navy-700 hover:underline">
                {t("common.viewAll")}
              </Link>
            }
          >
            {pending.length ? (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t("admin.fields.student")}</th>
                      <th>{t("admin.fields.course")}</th>
                      <th className="w-28">{t("common.date")}</th>
                      <th className="w-56" />
                    </tr>
                  </thead>
                  <tbody>
                    {plain(pending).map((e) => (
                      <tr key={e._id}>
                        <td>
                          <span className="block font-medium text-ink">{e.student?.name}</span>
                          <span className="block text-[11.5px] text-muted">{e.student?.email}</span>
                        </td>
                        <td>
                          <span className="flex items-center gap-2">
                            <LevelBadge level={e.course?.level} />
                            <span className="min-w-0 truncate">{e.course?.title}</span>
                          </span>
                          {e.message && <span className="mt-0.5 block line-clamp-1 text-[11.5px] italic text-muted">“{e.message}”</span>}
                        </td>
                        <td className="whitespace-nowrap text-muted">{formatDate(e.createdAt, locale)}</td>
                        <td>
                          <div className="flex justify-end">
                            <EnrollmentActions e={e} t={t} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState icon={<Layers className="size-4" />} title={t("admin.overview.noRequests")} />
            )}
          </Panel>

          {/* ------------------------------------------------ upcoming classes */}
          <Panel title={t("admin.overview.upcoming")} bodyClassName="divide-y divide-line">
            {lessons.length ? (
              plain(lessons).map((l) => <LessonItem key={l._id} lesson={l} t={t} locale={locale} showCourse isTeacher />)
            ) : (
              <EmptyState icon={<CalendarDays className="size-4" />} title={t("student.overview.noSessions")} />
            )}
          </Panel>
        </div>

        <div className="space-y-5">
          {/* ------------------------------------------------- running courses */}
          <Panel
            title={t("admin.overview.running")}
            action={
              <Link href="/admin/courses" className="text-[11.5px] font-semibold text-navy-700 hover:underline">
                {t("common.viewAll")}
              </Link>
            }
            bodyClassName="divide-y divide-line"
          >
            {courses.length ? (
              plain(courses).map((c) => {
                const n = counts[c._id] || 0;
                const full = Math.min(100, Math.round((n / c.capacity) * 100));
                return (
                  <Link key={c._id} href={`/admin/courses/${c._id}`} className="block px-3.5 py-2.5 hover:bg-cream/60">
                    <div className="flex items-center gap-2">
                      <LevelBadge level={c.level} />
                      <p className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">{c.title}</p>
                      <span className="shrink-0 text-[11.5px] text-muted tabular">
                        {n}/{c.capacity}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1 w-full bg-canvas">
                      <div className="h-full bg-navy-700" style={{ width: `${full}%` }} />
                    </div>
                  </Link>
                );
              })
            ) : (
              <EmptyState title={t("admin.courses.empty")} />
            )}
          </Panel>

          {/* ---------------------------------------------- awaiting marking */}
          <Panel
            title={t("admin.overview.toGrade")}
            action={
              <Link href="/admin/grading" className="text-[11.5px] font-semibold text-navy-700 hover:underline">
                {t("common.viewAll")}
              </Link>
            }
            bodyClassName="divide-y divide-line"
          >
            {recentSubs.length ? (
              plain(recentSubs).map((s) => (
                <Link key={s._id} href="/admin/grading" className="block px-3.5 py-2.5 hover:bg-cream/60">
                  <p className="truncate text-[13px] font-medium text-ink">{s.assignment?.title}</p>
                  <p className="mt-0.5 text-[11.5px] text-muted">
                    {s.student?.name} · {formatDate(s.updatedAt, locale)}
                  </p>
                </Link>
              ))
            ) : (
              <EmptyState icon={<FileCheck2 className="size-4" />} title={t("admin.grading.empty")} />
            )}
          </Panel>

          {newInquiries > 0 && (
            <Link href="/admin/inquiries" className="card flex items-center gap-2.5 px-3.5 py-2.5 hover:border-navy-600/40 hover:bg-cream/60">
              <Inbox className="size-4 shrink-0 text-navy-700" />
              <span className="flex-1 text-[13px] font-medium text-ink">{t("admin.stats.newInquiries", { n: newInquiries })}</span>
              <span className="text-[11.5px] font-semibold text-navy-700">{t("common.viewAll")}</span>
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
