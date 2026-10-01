import Link from "next/link";
import { Layers, FileCheck2, Inbox, Plus, CalendarRange } from "lucide-react";
import { PageHeader, StatRow, Panel, EmptyState, Breadcrumb } from "@/components/ui/Blocks";
import { LevelBadge } from "@/components/ui/Badges";
import CourseRows from "@/components/admin/CourseRows";
import EnrollmentActions from "@/components/admin/EnrollmentActions";
import { requireStaff } from "@/lib/auth";
import { can, isOwner, ownCoursesFilter } from "@/lib/roles";
import { getI18n } from "@/lib/i18n/server";
import { lessonState } from "@/lib/student-data";
import { plannedCount } from "@/lib/schedule";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Course from "@/models/Course";
import Enrollment from "@/models/Enrollment";
import Lesson from "@/models/Lesson";
import Submission from "@/models/Submission";
import Inquiry from "@/models/Inquiry";
import "@/models/Assignment";
import { formatDate, formatMoney, nowMs, plain } from "@/lib/utils";
import PaymentReminders from "@/components/portal/PaymentReminders";
import { schoolToday } from "@/lib/installments";

/**
 * The overview.
 *
 * Organised by course rather than by class. A term is hundreds of classes and
 * listing them one under another says nothing you can act on; what a person
 * running an academy wants at a glance is the state of each course — when it
 * next meets, how far through it is, whether it is full — and the two or three
 * things actually waiting for a decision.
 */
export default async function AdminOverview() {
  const user = await requireStaff();
  const { t, locale } = await getI18n();
  await connectDB();

  const owner = isOwner(user);
  const money = can(user, "finance.view");
  const decide = can(user, "enrollments.decide");

  const mine = await Course.find({ ...ownCoursesFilter(user), status: { $ne: "archived" } })
    .select("title level teacher capacity currency meetings sessionMin schedule status startDate endDate classroom")
    .sort({ level: 1, title: 1 })
    .lean();
  const mineIds = mine.map((c) => c._id);
  const courseScope = owner ? {} : { course: { $in: mineIds } };

  // One pass over the classes and one over the enrolments, then everything the
  // page needs is worked out in memory. A term is a few hundred rows, which is
  // cheaper to read once than to ask about six times.
  const [lessons, enrolments, students, revenueAgg, outstandingAgg, toGrade, newInquiries, pending, recentSubs, staff] = await Promise.all([
    mineIds.length ? Lesson.find({ course: { $in: mineIds } }).select("course title startsAt durationMin").sort({ startsAt: 1 }).lean() : [],
    mineIds.length ? Enrollment.find({ course: { $in: mineIds } }).select("course status").lean() : [],
    owner ? User.countDocuments({ role: "student" }) : Enrollment.distinct("student", { ...courseScope, status: "active" }).then((l) => l.length),
    money ? Enrollment.aggregate([{ $match: { paymentStatus: { $in: ["paid", "partial"] } } }, { $group: { _id: null, total: { $sum: { $cond: [{ $eq: ["$paymentStatus", "paid"] }, "$amount", { $ifNull: ["$paidAmount", 0] }] } } } }]) : [],
    money ? Enrollment.aggregate([{ $match: { paymentStatus: { $in: ["unpaid", "partial"] }, status: { $in: ["active", "completed"] } } }, { $group: { _id: null, total: { $sum: { $subtract: ["$amount", { $ifNull: ["$paidAmount", 0] }] } } } }]) : [],
    Submission.countDocuments({ ...courseScope, status: "submitted" }),
    can(user, "inquiries.manage") ? Inquiry.countDocuments({ status: "new" }) : 0,
    decide
      ? Enrollment.find({ status: "pending" }).populate("student", "name email level").populate("course", "title level").sort({ createdAt: -1 }).limit(6).lean()
      : [],
    Submission.find({ ...courseScope, status: "submitted" }).populate("student", "name").populate("assignment", "title").sort({ createdAt: -1 }).limit(5).lean(),
    owner ? User.find({ role: { $in: ["owner", "teacher", "admin"] } }).select("name").lean() : [],
  ]);

  const now = nowMs();
  const nameOf = Object.fromEntries(staff.map((s) => [String(s._id), s.name]));

  const tally = {};
  for (const l of lessons) {
    const key = String(l.course);
    const row = (tally[key] ||= { total: 0, done: 0, next: null });
    row.total += 1;
    const state = lessonState(l);
    if (state === "past") row.done += 1;
    else if (!row.next) row.next = { ...l, state };
  }

  const seats = {};
  for (const e of enrolments) {
    const key = String(e.course);
    const row = (seats[key] ||= { active: 0, pending: 0 });
    if (e.status === "active") row.active += 1;
    if (e.status === "pending") row.pending += 1;
  }

  const courses = plain(mine).map((c) => {
    const n = tally[c._id] || { total: 0, done: 0, next: null };
    const s = seats[c._id] || { active: 0, pending: 0 };
    const next = n.next
      ? {
          _id: String(n.next._id),
          title: n.next.title,
          startsAt: n.next.startsAt,
          state: n.next.state,
          // "Soon" is the hour before the bell: long enough to let a teacher in
          // early, short enough that the button is not on screen all week.
          soon: new Date(n.next.startsAt).getTime() - now < 60 * 60000,
          href: c.classroom === "external" ? `/admin/courses/${c._id}` : `/classroom/${String(n.next._id)}`,
        }
      : null;
    // Only a few weeks of classes exist at a time, so the term's length comes
    // from the weekly pattern rather than from the rows written so far.
    const total = plannedCount(c) ?? n.total;
    return { ...c, teacher: c.teacher ? nameOf[String(c.teacher)] || "" : "", total: Math.max(total, n.done), done: n.done, next, ...s };
  });

  // Whatever is happening soonest comes first; courses with nothing planned sink.
  courses.sort((a, b) => {
    const at = a.next ? new Date(a.next.startsAt).getTime() : Infinity;
    const bt = b.next ? new Date(b.next.startsAt).getTime() : Infinity;
    return at - bt || a.title.localeCompare(b.title);
  });

  const running = courses.filter((c) => c.next).length;
  const currency = mine[0]?.currency || "EUR";
  const pendingCount = enrolments.filter((e) => e.status === "pending").length;
  const activeCount = enrolments.filter((e) => e.status === "active").length;
  const installmentEnrollments = owner ? plain(await Enrollment.find({ paymentStatus: "partial", status: { $in: ["active", "completed"] } }).populate("student", "name").populate("course", "title currency").sort({ paymentDueDate: 1 }).lean()) : [];

  return (
    <>
      <PageHeader
        title={t("admin.overview.title", { name: user.name.split(" ")[0] })}
        description={t(owner ? "admin.overview.subtitle" : "admin.overview.teacherSubtitle")}
        actions={
          <>
            <Link href="/admin/schedule" className="btn btn-outline">
              <CalendarRange className="size-3.5" /> {t("admin.nav.schedule")}
            </Link>
            {can(user, "courses.create") && (
              <Link href="/admin/courses?new=1" className="btn btn-primary">
                <Plus className="size-3.5" /> {t("admin.courses.new")}
              </Link>
            )}
          </>
        }
      >
        <Breadcrumb trail={[t(owner ? "admin.portal" : "admin.teacherPortal"), t("admin.nav.overview")]} />
      </PageHeader>
      {owner && <PaymentReminders enrollments={installmentEnrollments} owner today={schoolToday()} />}

      <StatRow
        items={[
          { label: t("admin.stats.courses"), value: courses.length, hint: t("admin.stats.coursesHint", { n: running }) },
          { label: t("admin.stats.students"), value: students, hint: t("admin.stats.activeEnrollments", { n: activeCount }) },
          money
            ? {
                label: t("admin.stats.revenue"),
                value: formatMoney(revenueAgg[0]?.total || 0, currency, locale),
                hint: t("admin.stats.outstanding", { amount: formatMoney(outstandingAgg[0]?.total || 0, currency, locale) }),
              }
            : { label: t("admin.stats.pending"), value: pendingCount, hint: t("admin.stats.pendingHint") },
          {
            label: t("admin.stats.toGrade"),
            value: toGrade,
            alert: toGrade > 0,
            hint: money ? t("admin.stats.newInquiries", { n: newInquiries }) : t("admin.stats.toGradeHint"),
          },
        ]}
      />

      {/* --------------------------------------------------------- the courses */}
      <Panel
        className="mt-5"
        title={t(owner ? "admin.overview.running" : "admin.overview.myCourses")}
        action={
          <Link href="/admin/courses" className="text-[11.5px] font-semibold text-navy-700 hover:underline">
            {t("common.viewAll")}
          </Link>
        }
      >
        <CourseRows courses={courses} t={t} locale={locale} showTeacher={owner} />
      </Panel>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          {/* --------------------------------------------- enrolment requests */}
          {decide && (
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
          )}
        </div>

        <div className="space-y-5">
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

export const dynamic = "force-dynamic";
