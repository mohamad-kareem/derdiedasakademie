import { CalendarDays } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/ui/Blocks";
import TimetableBoard from "@/components/admin/TimetableBoard";
import { requireStaff } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { isOwner, ownCoursesFilter, teaches } from "@/lib/roles";
import connectDB from "@/lib/mongodb";
import Course from "@/models/Course";
import Lesson from "@/models/Lesson";
import User from "@/models/User";
import { topUpAll } from "@/lib/fill";
import { sortMeetings } from "@/lib/schedule";
import { nowMs, plain } from "@/lib/utils";

/**
 * The timetable.
 *
 * The courses on their weekly slots, not the individual classes — "German A1
 * Evening, Mondays and Wednesdays at six" is the thing being arranged, and the
 * sessions are what follows from it.
 *
 * Opening this page is also what keeps the calendar topped up: any course
 * whose next few weeks have not been written yet gets them now. That is why
 * there is no scheduled job anywhere in this system — the work happens when
 * somebody looks, which is always in time.
 */
export default async function SchedulePage() {
  const user = await requireStaff();
  const { t, locale } = await getI18n();
  await connectDB();

  const owner = isOwner(user);
  const visible = await Course.find({ ...ownCoursesFilter(user), status: { $ne: "archived" } })
    .select("title level teacher meetings sessionMin weeksAhead filledUntil startDate endDate status")
    .sort({ title: 1 })
    .lean();

  // Top up the courses this person is responsible for. Somebody else's course
  // is not this person's job and is left to whoever opens their own timetable.
  const mine = visible.filter((c) => teaches(user, c) && (c.meetings || []).length);
  if (mine.length) await topUpAll(mine, { title: t("admin.timetable.sessionName") });

  const now = nowMs();
  const [staff, counts, nextUp] = await Promise.all([
    owner ? User.find({ role: { $in: ["owner", "teacher", "admin"] } }).select("name").sort({ name: 1 }).lean() : [],
    visible.length
      ? Lesson.aggregate([{ $match: { course: { $in: visible.map((c) => c._id) } } }, { $group: { _id: "$course", n: { $sum: 1 } } }])
      : [],
    visible.length
      ? Lesson.find({ course: { $in: visible.map((c) => c._id) }, startsAt: { $gte: new Date(now) } })
          .select("course startsAt")
          .sort({ startsAt: 1 })
          .lean()
      : [],
  ]);

  const nameOf = Object.fromEntries(staff.map((s) => [String(s._id), s.name]));
  const total = Object.fromEntries(counts.map((r) => [String(r._id), r.n]));
  const next = {};
  for (const l of nextUp) next[String(l.course)] ||= l.startsAt;
  const me = owner ? t("admin.timetable.you") : user.name;

  const courses = visible.map((c) => ({
    _id: String(c._id),
    title: c.title,
    level: c.level,
    status: c.status,
    teacher: c.teacher ? nameOf[String(c.teacher)] || "" : me,
    mine: teaches(user, c),
    sessionMin: c.sessionMin || 90,
    weeksAhead: c.weeksAhead ?? 3,
    filledUntil: c.filledUntil || null,
    sessions: total[String(c._id)] || 0,
    nextAt: next[String(c._id)] || null,
    slots: sortMeetings(c.meetings || []).map((m, i) => ({ index: i, day: m.day, start: m.start })),
  }));

  // One block per slot: a course that meets twice a week appears twice.
  const slots = courses.flatMap((c) =>
    c.slots.map((s) => ({
      key: `${c._id}:${s.index}`,
      course: c._id,
      index: s.index,
      day: s.day,
      start: s.start,
      sessionMin: c.sessionMin,
      title: `${c.level} · ${c.title}`,
      teacher: c.teacher,
      mine: c.mine,
    })),
  );

  return (
    <>
      <PageHeader
        title={t("admin.timetable.title")}
        description={owner ? t("admin.timetable.subtitleOwner") : t("admin.timetable.subtitleTeacher")}
      />
      {courses.length ? (
        <TimetableBoard slots={plain(slots)} courses={plain(courses)} locale={locale} />
      ) : (
        <EmptyState
          icon={<CalendarDays className="size-5" />}
          title={t("admin.timetable.noCourses")}
          text={t("admin.timetable.noCoursesText")}
        />
      )}
    </>
  );
}

export const dynamic = "force-dynamic";
