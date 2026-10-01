import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Lesson from "@/models/Lesson";
import Course from "@/models/Course";
import Enrollment from "@/models/Enrollment";
import User from "@/models/User";
import { isEmailConfigured } from "@/lib/email";
import { classReminder } from "@/lib/letters";

/**
 * "You have a class today."
 *
 * Something outside the application has to knock on this door, because a
 * reminder has to go out whether or not anybody happens to be looking at the
 * site. Two ways to arrange that, both free:
 *
 *   Vercel's own scheduler, by adding a `crons` entry to vercel.json. On the
 *   free plan it fires about once a day, which suits a morning "today's
 *   classes" letter.
 *
 *   cron-job.org, or anything like it, calling this address every quarter of
 *   an hour with the secret in the query string. That gives the sharper
 *   "starts in an hour" letter.
 *
 * Either way the work is the same and safe to repeat: a class is marked the
 * moment its letters go out, so calling this a hundred times a day sends each
 * reminder exactly once.
 */

// How far ahead to look. An hour and a half covers a quarter-hourly caller
// comfortably; a once-a-day caller wants the whole day.
const WINDOW_MIN = Number(process.env.REMINDER_WINDOW_MIN || 90);

export async function GET(request) {
  const secret = process.env.CRON_SECRET || "";
  const given = request.nextUrl.searchParams.get("key") || (request.headers.get("authorization") || "").replace(/^Bearer /, "");
  if (!secret || given !== secret) return NextResponse.json({ message: "Not found." }, { status: 404 });
  if (!isEmailConfigured()) return NextResponse.json({ sent: 0, reason: "email not configured" });

  await connectDB();
  const now = new Date();
  const until = new Date(now.getTime() + WINDOW_MIN * 60000);

  const due = await Lesson.find({ startsAt: { $gte: now, $lte: until }, remindedAt: null })
    .select("course title startsAt durationMin meetingUrl")
    .sort({ startsAt: 1 })
    .limit(40)
    .lean();
  if (!due.length) return NextResponse.json({ sent: 0 });

  const courses = Object.fromEntries(
    (await Course.find({ _id: { $in: due.map((l) => l.course) } }).select("title classroom meetingUrl teacher").lean())
      .map((c) => [String(c._id), c]),
  );

  let sent = 0;
  for (const lesson of due) {
    const course = courses[String(lesson.course)];
    if (!course) continue;

    const enrolments = await Enrollment.find({ course: lesson.course, status: "active" }).select("student").lean();
    const ids = enrolments.map((e) => e.student);
    if (course.teacher) ids.push(course.teacher);
    if (!ids.length) {
      await Lesson.updateOne({ _id: lesson._id }, { remindedAt: now });
      continue;
    }

    const people = await User.find({ _id: { $in: ids }, isActive: true }).select("name email locale").lean();
    for (const person of people) {
      if (await classReminder(person, lesson, course)) sent += 1;
    }
    // Marked whatever happened: a reminder nobody can send is not worth
    // retrying every quarter of an hour until the class has already begun.
    await Lesson.updateOne({ _id: lesson._id }, { remindedAt: now });
  }

  return NextResponse.json({ sent, classes: due.length });
}

export const dynamic = "force-dynamic";
