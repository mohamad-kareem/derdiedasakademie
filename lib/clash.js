import Course from "@/models/Course";
import Lesson from "@/models/Lesson";
import { clockOf, overlaps, slotsOverlap, sortMeetings, DAY_KEYS } from "@/lib/schedule";
import { formatDateTime } from "@/lib/utils";

/**
 * Nobody can teach two classes at once.
 *
 * The rule is about the *person*, not the course: if Anna runs three courses,
 * Tuesday at six in one of them blocks that hour in the other two. Courses
 * with no teacher set are the owner's own and are checked against each other
 * in exactly the same way.
 *
 * It is asked twice. At the timetable level, two courses may not claim the
 * same weekly slot — that is the one that matters, because it is where a
 * clash is created. At the session level it is asked again for the one-off
 * classes somebody adds by hand.
 */

/** Every course run by whoever runs `course`, this one included. */
async function siblings(course) {
  const teacher = course.teacher ? String(course.teacher) : null;
  const list = await Course.find(teacher ? { teacher } : { teacher: null })
    .select("title level meetings sessionMin teacher startDate endDate status")
    .lean();
  if (!list.some((c) => String(c._id) === String(course._id))) list.push({ ...course });
  return list;
}

/** Whether two courses can overlap at all — archived ones and past terms cannot. */
function runsAlongside(a, b) {
  if (a.status === "archived" || b.status === "archived") return false;
  if (!a.startDate || !a.endDate || !b.startDate || !b.endDate) return true;
  return new Date(a.startDate) <= new Date(b.endDate) && new Date(b.startDate) <= new Date(a.endDate);
}

/**
 * The first weekly slot these meetings would run into, or null.
 *
 * Returns the offending course and the slot, so the refusal can say what is
 * already there rather than just "no".
 */
export async function patternClash(course, meetings, sessionMin) {
  const wanted = sortMeetings(meetings);
  if (!wanted.length) return null;

  // Two slots of the same course must not collide with each other either.
  for (let i = 0; i < wanted.length; i += 1) {
    for (let j = i + 1; j < wanted.length; j += 1) {
      if (slotsOverlap(wanted[i], sessionMin, wanted[j], sessionMin)) {
        return { self: true, course: course.title || "", slot: wanted[j] };
      }
    }
  }

  const others = (await siblings(course)).filter((c) => String(c._id) !== String(course._id));
  for (const other of others) {
    if (!runsAlongside({ ...course, status: course.status || "published" }, other)) continue;
    for (const mine of wanted) {
      for (const theirs of sortMeetings(other.meetings || [])) {
        if (slotsOverlap(mine, sessionMin, theirs, other.sessionMin || 90)) {
          return { course: other.title, level: other.level, slot: theirs, span: other.sessionMin || 90 };
        }
      }
    }
  }
  return null;
}

/** What a refused weekly slot says: which course is already there, and when. */
export function slotVars(clash, t) {
  return { course: clash.course, day: t(`weekdays.long.${DAY_KEYS[clash.slot.day]}`), time: clockOf(clash.slot.start) };
}

/** The same for a single class that ran into another. */
export function sessionVars(clash, locale = "en") {
  return { title: clash.title, course: clash.courseTitle, time: formatDateTime(clash.startsAt, locale) };
}

/* ------------------------------------------------------- one-off sessions */

/** The teacher's diary between two instants, each class named by its course. */
export async function teacherAgenda(course, { from, to }) {
  const list = await siblings(course);
  const titles = Object.fromEntries(list.map((c) => [String(c._id), c.title]));
  const lessons = await Lesson.find({
    course: { $in: list.map((c) => c._id) },
    startsAt: { $gte: new Date(from), $lte: new Date(to) },
  })
    .select("title startsAt durationMin course")
    .lean();
  return lessons.map((l) => ({
    _id: String(l._id),
    title: l.title,
    startsAt: l.startsAt,
    durationMin: l.durationMin || 90,
    course: String(l.course),
    courseTitle: titles[String(l.course)] || "",
  }));
}

/** The first class in that diary this one would run into, or null. */
export function clashIn(agenda, startsAt, durationMin, ignore = []) {
  const skip = new Set(ignore.filter(Boolean).map(String));
  return agenda.find((l) => !skip.has(l._id) && overlaps(startsAt, durationMin, l.startsAt, l.durationMin)) || null;
}

/** The same question for a single class, when there is no batch to check. */
export async function findClash(course, startsAt, durationMin, ignore = []) {
  const day = 24 * 3600 * 1000;
  const agenda = await teacherAgenda(course, {
    from: new Date(new Date(startsAt).getTime() - day),
    to: new Date(new Date(startsAt).getTime() + day),
  });
  return clashIn(agenda, startsAt, durationMin, ignore);
}
