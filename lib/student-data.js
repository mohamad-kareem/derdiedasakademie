import connectDB from "@/lib/mongodb";
import Enrollment from "@/models/Enrollment";
import Lesson from "@/models/Lesson";
import Assignment from "@/models/Assignment";
import Submission from "@/models/Submission";
import Announcement from "@/models/Announcement";
import "@/models/Course";
import { plain, formatDateTime } from "@/lib/utils";

export async function getMyEnrollments(studentId) {
  await connectDB();
  const list = await Enrollment.find({ student: studentId }).populate("course").sort({ createdAt: -1 }).lean();
  return plain(list.filter((e) => e.course));
}

export function accessibleCourseIds(enrollments) {
  return enrollments.filter((e) => ["active", "completed"].includes(e.status)).map((e) => e.course._id);
}

export async function getMyAssignments(studentId, courseIds, locale = "en") {
  if (!courseIds.length) return [];
  const [assignments, submissions] = await Promise.all([
    Assignment.find({ course: { $in: courseIds } }).populate("course", "title level").sort({ dueDate: 1, createdAt: -1 }).lean(),
    Submission.find({ student: studentId, course: { $in: courseIds } }).lean(),
  ]);
  const byAssignment = Object.fromEntries(submissions.map((s) => [String(s.assignment), s]));
  const now = Date.now();
  return plain(
    assignments.map((a) => {
      const submission = byAssignment[String(a._id)] || null;
      let state = "todo";
      if (submission) state = submission.status;
      else if (a.dueDate && new Date(a.dueDate).getTime() < now) state = "missing";
      return { ...a, submission, state, dueText: a.dueDate ? formatDateTime(a.dueDate, locale) : null };
    }),
  );
}

export async function getUpcomingLessons(courseIds, limit = 5) {
  if (!courseIds.length) return [];
  const since = new Date(Date.now() - 3 * 60 * 60 * 1000);
  return plain(
    await Lesson.find({ course: { $in: courseIds }, startsAt: { $gte: since } })
      .populate("course", "title level meetingUrl")
      .sort({ startsAt: 1 })
      .limit(limit)
      .lean(),
  );
}

export async function getAnnouncements(courseIds, limit = 5) {
  return plain(
    await Announcement.find({ $or: [{ course: null }, { course: { $in: courseIds } }] })
      .populate("course", "title level")
      .sort({ pinned: -1, createdAt: -1 })
      .limit(limit)
      .lean(),
  );
}

export function lessonState(lesson) {
  const start = new Date(lesson.startsAt).getTime();
  const end = start + (lesson.durationMin || 90) * 60000;
  const now = Date.now();
  if (now >= start - 15 * 60000 && now <= end) return "live";
  if (now > end) return "past";
  return "upcoming";
}
