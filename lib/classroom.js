import connectDB from "@/lib/mongodb";
import Lesson from "@/models/Lesson";
import Course from "@/models/Course";
import Enrollment from "@/models/Enrollment";
import { isId } from "@/lib/validate";

export const OPEN_BEFORE_MIN = 30;
export const OPEN_AFTER_MIN = 90;

/**
 * Loads a lesson and decides whether the user may enter its classroom.
 * Returns { lesson, course, isTeacher, reason } — reason is set when access is denied.
 */
export async function classroomAccess(user, lessonId) {
  if (!user || !isId(lessonId)) return { reason: "notFound" };
  await connectDB();
  const lesson = await Lesson.findById(lessonId).lean();
  if (!lesson) return { reason: "notFound" };
  const course = await Course.findById(lesson.course).lean();
  if (!course) return { reason: "notFound" };
  const isTeacher = user.role === "admin";
  if (isTeacher) return { lesson, course, isTeacher };

  const enrolled = await Enrollment.exists({ student: user.id, course: course._id, status: "active" });
  if (!enrolled) return { lesson, course, reason: "notEnrolled" };
  const start = new Date(lesson.startsAt).getTime();
  const end = start + (lesson.durationMin || 90) * 60000;
  const now = Date.now();
  if (now < start - OPEN_BEFORE_MIN * 60000) return { lesson, course, reason: "tooEarly" };
  if (now > end + OPEN_AFTER_MIN * 60000 || lesson.endedAt) return { lesson, course, reason: "ended" };
  if (lesson.roomLocked) return { lesson, course, reason: "locked" };
  return { lesson, course, isTeacher: false };
}
