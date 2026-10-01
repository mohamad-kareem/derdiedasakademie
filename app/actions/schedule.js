"use server";

import { revalidatePath } from "next/cache";
import connectDB from "@/lib/mongodb";
import { actionUser } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { can, teaches } from "@/lib/roles";
import Course from "@/models/Course";
import Lesson from "@/models/Lesson";
import { isId, fail, done } from "@/lib/validate";
import { patternClash, slotVars } from "@/lib/clash";
import { topUp, reschedule } from "@/lib/fill";
import { sortMeetings } from "@/lib/schedule";
import { plain } from "@/lib/utils";

/**
 * The timetable's actions.
 *
 * What is being edited here is the course's weekly pattern — which evenings it
 * meets and at what time — not any single class. Changing it re-reckons the
 * sessions that follow from it, always by adding the ones that are now due and
 * never by quietly moving the ones already in the diary.
 */

/** The course, but only if this member of staff is the one who runs it. */
async function ownCourse(courseId) {
  const user = await actionUser("staff");
  if (!user || !can(user, "teaching.manage") || !isId(String(courseId))) return null;
  await connectDB();
  const course = await Course.findById(courseId)
    .select("title level teacher meetings sessionMin weeksAhead filledUntil startDate endDate status")
    .lean();
  if (!course || !teaches(user, course)) return null;
  return course;
}

function refresh() {
  revalidatePath("/", "layout");
}

function readMeetings(raw) {
  const list = Array.isArray(raw) ? raw : [];
  const seen = new Set();
  const out = [];
  for (const m of list) {
    const day = Number(m?.day);
    const start = Math.round(Number(m?.start) / 5) * 5;
    if (!Number.isInteger(day) || day < 0 || day > 6) continue;
    if (!Number.isFinite(start) || start < 0 || start > 1439) continue;
    const key = `${day}:${start}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ day, start });
  }
  return sortMeetings(out).slice(0, 14);
}

/* ----------------------------------------------------------- the pattern */

/**
 * Set a course's whole weekly pattern: which days, at what time, for how long,
 * and how far ahead its sessions should be written.
 */
export async function saveTimetable(courseId, next) {
  const course = await ownCourse(courseId);
  if (!course) return fail("errors.forbidden");
  const { t } = await getI18n();

  const meetings = readMeetings(next?.meetings);
  const sessionMin = Math.min(600, Math.max(15, Math.round(Number(next?.sessionMin) || course.sessionMin || 90)));
  const weeksAhead = Math.min(12, Math.max(0, Math.round(Number(next?.weeksAhead ?? course.weeksAhead ?? 3))));

  const clash = await patternClash(course, meetings, sessionMin);
  if (clash) return fail(clash.self ? "admin.timetable.selfClash" : "admin.timetable.clash", slotVars(clash, t));

  await Course.updateOne({ _id: courseId }, { meetings, sessionMin, weeksAhead });
  const res = await reschedule({ ...course, meetings, sessionMin, weeksAhead }, { title: t("admin.timetable.sessionName") });

  refresh();
  return { ok: true, message: "admin.saved", added: res.added, removed: res.removed, skipped: plain(res.skipped) };
}

/** Drag a course's slot to another day or hour. */
export async function moveSlot(courseId, index, day, start) {
  const course = await ownCourse(courseId);
  if (!course) return fail("errors.forbidden");
  const { t } = await getI18n();

  const meetings = sortMeetings(course.meetings || []);
  const i = Number(index);
  if (!Number.isInteger(i) || i < 0 || i >= meetings.length) return fail("errors.notFound");

  const next = meetings.map((m, j) => (j === i ? { day: Number(day), start: Math.round(Number(start) / 5) * 5 } : { day: m.day, start: m.start }));
  const clean = readMeetings(next);
  if (clean.length !== meetings.length) return fail("admin.timetable.duplicateSlot");

  const clash = await patternClash(course, clean, course.sessionMin || 90);
  if (clash) return fail(clash.self ? "admin.timetable.selfClash" : "admin.timetable.clash", slotVars(clash, t));

  await Course.updateOne({ _id: courseId }, { meetings: clean });
  await reschedule({ ...course, meetings: clean }, { title: t("admin.timetable.sessionName") });
  refresh();
  return done("admin.timetable.moved");
}

/** Add one more weekly slot to a course. */
export async function addSlot(courseId, day, start) {
  const course = await ownCourse(courseId);
  if (!course) return fail("errors.forbidden");
  const { t } = await getI18n();

  const clean = readMeetings([...(course.meetings || []), { day, start }]);
  if (clean.length === (course.meetings || []).length) return fail("admin.timetable.duplicateSlot");

  const clash = await patternClash(course, clean, course.sessionMin || 90);
  if (clash) return fail(clash.self ? "admin.timetable.selfClash" : "admin.timetable.clash", slotVars(clash, t));

  await Course.updateOne({ _id: courseId }, { meetings: clean });
  const res = await reschedule({ ...course, meetings: clean }, { title: t("admin.timetable.sessionName") });
  refresh();
  return { ok: true, message: "admin.timetable.slotAdded", added: res.added };
}

/** Take a weekly slot off the timetable. */
export async function removeSlot(courseId, index) {
  const course = await ownCourse(courseId);
  if (!course) return fail("errors.forbidden");
  const meetings = sortMeetings(course.meetings || []);
  const i = Number(index);
  if (!Number.isInteger(i) || i < 0 || i >= meetings.length) return fail("errors.notFound");
  const clean = meetings.filter((_, j) => j !== i).map((m) => ({ day: m.day, start: m.start }));
  await Course.updateOne({ _id: courseId }, { meetings: clean });
  const { t } = await getI18n();
  await reschedule({ ...course, meetings: clean }, { title: t("admin.timetable.sessionName") });
  refresh();
  return done("admin.timetable.slotRemoved");
}

/* -------------------------------------------------------------- sessions */

/** Write the next stretch of sessions now, rather than waiting. */
export async function fillNow(courseId) {
  const course = await ownCourse(courseId);
  if (!course) return fail("errors.forbidden");
  const { t } = await getI18n();
  const res = await topUp(course, { title: t("admin.timetable.sessionName") });
  refresh();
  return { ok: true, message: res.added ? "admin.timetable.filled" : "admin.timetable.nothingDue", vars: { n: res.added }, skipped: plain(res.skipped) };
}
