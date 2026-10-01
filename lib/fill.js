import Course from "@/models/Course";
import Lesson from "@/models/Lesson";
import { at, addDays, dayKey, datesOn, minutesOfDay, sortMeetings, weekdayOf } from "@/lib/schedule";
import { teacherAgenda, clashIn } from "@/lib/clash";

/**
 * Turning the weekly pattern into actual sessions, a few weeks at a time.
 *
 * Writing a whole term out at once gives you eighty rows nobody wants to look
 * at, most of them for classes that are months away and will have moved by
 * then. So the calendar is kept topped up instead: only the next few weeks
 * exist, and as those are taught the next few appear. `weeksAhead` on the
 * course says how far ahead to keep it, and `filledUntil` remembers how far
 * it has already gone.
 *
 * Two rules keep this safe to run at any moment, as often as you like:
 *
 *   It only ever adds. A session that exists is never moved, retimed or
 *   removed by the pattern, so anything edited by hand stays edited, and a
 *   session deleted on purpose does not reappear — `filledUntil` has already
 *   passed that date.
 *
 *   It never books somebody twice. A date where the teacher is already busy
 *   is left out and reported, rather than written on top of what is there.
 */

const MAX_PER_RUN = 60;

export async function topUp(course, { title = "Session {n}", now = new Date() } = {}) {
  const meetings = sortMeetings(course.meetings || []);
  const weeks = Number(course.weeksAhead ?? 3);
  if (!meetings.length || weeks <= 0 || !course.startDate || !course.endDate) return { added: 0, skipped: [] };

  const today = dayKey(now);
  const first = [today, dayKey(course.startDate), course.filledUntil ? addDays(dayKey(course.filledUntil), 1) : ""]
    .filter(Boolean)
    .sort()
    .pop();
  const last = [addDays(today, weeks * 7), dayKey(course.endDate)].sort().shift();
  if (first > last) return { added: 0, skipped: [] };

  const span = course.sessionMin || 90;
  const wanted = meetings
    .flatMap((m) => datesOn(m.day, first, last).map((key) => ({ key, start: m.start })))
    .sort((a, b) => (a.key === b.key ? a.start - b.start : a.key < b.key ? -1 : 1))
    .slice(0, MAX_PER_RUN);
  if (!wanted.length) {
    await Course.updateOne({ _id: course._id }, { filledUntil: at(last, 1439) });
    return { added: 0, skipped: [] };
  }

  const [existing, agenda, total] = await Promise.all([
    Lesson.find({ course: course._id, startsAt: { $gte: at(first, 0), $lte: at(last, 1439) } }).select("startsAt").lean(),
    teacherAgenda(course, { from: at(addDays(first, -1), 0), to: at(addDays(last, 1), 1439) }),
    Lesson.countDocuments({ course: course._id }),
  ]);
  const taken = new Set(existing.map((l) => new Date(l.startsAt).getTime()));

  const fresh = [];
  const skipped = [];
  let n = total;
  for (const slot of wanted) {
    const startsAt = at(slot.key, slot.start);
    if (!startsAt || taken.has(startsAt.getTime())) continue;
    const clash = clashIn(agenda, startsAt, span) || clashIn(fresh, startsAt, span);
    if (clash) {
      skipped.push({ key: slot.key, title: clash.title, course: clash.courseTitle });
      continue;
    }
    n += 1;
    const made = {
      _id: `new-${n}`,
      course: String(course._id),
      courseTitle: course.title,
      title: title.replace(/\{n\}/g, String(n)),
      startsAt,
      durationMin: span,
    };
    fresh.push(made);
  }

  if (fresh.length) {
    try {
      await Lesson.insertMany(
        fresh.map((l) => ({ course: course._id, title: l.title, startsAt: l.startsAt, durationMin: l.durationMin, auto: true })),
        { ordered: false },
      );
    } catch (err) {
      // Two people opening the timetable at the same moment can both decide a
      // date is missing. The index settles it: the second one is refused and
      // that is the right answer, not a failure.
      if (err?.code !== 11000 && !err?.writeErrors?.every((e) => e.err?.code === 11000)) throw err;
    }
  }
  await Course.updateOne({ _id: course._id }, { filledUntil: at(last, 1439) });
  return { added: fresh.length, skipped, until: last };
}

/** The same for a list of courses, one after another. */
export async function topUpAll(courses, opts) {
  let added = 0;
  const skipped = [];
  for (const course of courses) {
    const res = await topUp(course, opts);
    added += res.added;
    skipped.push(...res.skipped.map((s) => ({ ...s, course: course.title })));
  }
  return { added, skipped };
}

/**
 * Forget how far the calendar has been written, so the next top-up starts
 * again from today. Used when the pattern changes, since the dates that
 * follow from it are now different ones.
 */
export async function rewind(courseId) {
  await Course.updateOne({ _id: courseId }, { $unset: { filledUntil: "" } });
}

/**
 * Clearing up after a pattern change.
 *
 * Move a course from Tuesday to Thursday and its untaught Tuesday classes are
 * no longer anybody's plan — they are the debris of the old arrangement, and
 * leaving them in the calendar is worse than never having written them.
 *
 * Only the sessions the pattern wrote itself are ever removed, and only the
 * ones still in the future. The moment a session is edited by hand it stops
 * counting as the pattern's, so a class deliberately moved to a Friday is
 * safe; so is anything already taught.
 */
export async function prune(course, meetings, sessionMin, now = new Date()) {
  const slots = sortMeetings(meetings || []);
  const lessons = await Lesson.find({ course: course._id, auto: true, startsAt: { $gt: now } })
    .select("startsAt durationMin")
    .lean();
  const stale = lessons.filter((l) => {
    const day = weekdayOf(dayKey(l.startsAt));
    const start = minutesOfDay(l.startsAt);
    return !slots.some((m) => m.day === day && m.start === start) || (l.durationMin || 90) !== sessionMin;
  });
  if (!stale.length) return 0;
  await Lesson.deleteMany({ _id: { $in: stale.map((l) => l._id) }, course: course._id, auto: true });
  return stale.length;
}

/**
 * Everything that has to happen when a course's week changes: clear the debris
 * of the old arrangement, forget how far ahead the calendar was written, then
 * write the next stretch from the new pattern.
 */
export async function reschedule(course, { title } = {}) {
  const removed = await prune(course, course.meetings, course.sessionMin || 90);
  await rewind(course._id);
  const filled = await topUp({ ...course, filledUntil: null }, { title });
  return { removed, ...filled };
}
