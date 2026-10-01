import { parseLocalDateTime, toLocalInput, formatTime } from "@/lib/utils";

/**
 * The academy's week.
 *
 * A course does not meet on dates, it meets on days: Monday and Wednesday at
 * six. That pattern is the timetable, and the individual sessions are only
 * what falls out of it. So the vocabulary here is a day of the week (0 for
 * Monday through 6 for Sunday) and a time of day (minutes past midnight), both
 * read in Berlin time — which is why a Tuesday at 18:00 stays a Tuesday at
 * 18:00 when the clocks change.
 */

export const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

/* ------------------------------------------------------------ times of day */

/** "18:30" from minutes past midnight. */
export function clockOf(minutes) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(Math.round(minutes % 60)).padStart(2, "0")}`;
}

/** Minutes past midnight from "18:30". */
export function minutesOfClock(clock) {
  const [h, m] = String(clock || "").split(":").map(Number);
  return Number.isFinite(h) ? (h % 24) * 60 + (Number.isFinite(m) ? m % 60 : 0) : 0;
}

/** Minutes past midnight of an instant, in academy time. */
export function minutesOfDay(value) {
  return minutesOfClock(toLocalInput(value).slice(11, 16));
}

/* ------------------------------------------------------- calendar days */

/** "2026-09-24" — the calendar day an instant falls on, in academy time. */
export function dayKey(value) {
  return toLocalInput(value, true);
}

/** A calendar day and a time of day, back to a real instant. */
export function at(key, minutes) {
  return parseLocalDateTime(`${key}T${clockOf(minutes)}`);
}

function parts(key) {
  const [y, m, d] = String(key).split("-").map(Number);
  return { y, m, d };
}

/** Counted in UTC, so no daylight change can shift a day count. */
export function addDays(key, n) {
  const { y, m, d } = parts(key);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** 0 is Monday, 6 is Sunday. */
export function weekdayOf(key) {
  const { y, m, d } = parts(key);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

export function startOfWeek(key) {
  return addDays(key, -weekdayOf(key));
}

/** The seven days of the week that `key` falls in, Monday first. */
export function weekDays(key) {
  const first = startOfWeek(key);
  return Array.from({ length: 7 }, (_, i) => addDays(first, i));
}

/** Every date between two days, inclusive, that falls on `day` of the week. */
export function datesOn(day, fromKey, toKey) {
  const out = [];
  let key = addDays(startOfWeek(fromKey), day);
  while (key < fromKey) key = addDays(key, 7);
  while (key <= toKey) {
    out.push(key);
    key = addDays(key, 7);
  }
  return out;
}

/**
 * How many classes the course's pattern comes to over its whole run.
 *
 * Only a few weeks of sessions exist at any moment, so counting the rows in
 * the calendar would say "1 of 3" for a course that actually has twenty-six
 * classes ahead of it. The honest figure is the one the pattern implies
 * between the start and end dates. Null when there is no pattern to count.
 */
export function plannedCount(course) {
  const slots = sortMeetings(course?.meetings || []);
  if (!slots.length || !course.startDate || !course.endDate) return null;
  const from = dayKey(course.startDate);
  const to = dayKey(course.endDate);
  if (from > to) return 0;
  return slots.reduce((n, m) => n + datesOn(m.day, from, to).length, 0);
}

/* ---------------------------------------------------------------- overlaps */

/** Whether two weekly slots collide — same day, hours in common. */
export function slotsOverlap(a, aMin, b, bMin) {
  if (a.day !== b.day) return false;
  return a.start < b.start + bMin && b.start < a.start + aMin;
}

/** Whether two classes are in the air at the same moment. */
export function overlaps(aStart, aMin, bStart, bMin) {
  const a1 = new Date(aStart).getTime();
  const b1 = new Date(bStart).getTime();
  return a1 < b1 + Math.max(1, bMin) * 60000 && b1 < a1 + Math.max(1, aMin) * 60000;
}

/* -------------------------------------------------------- reading it aloud */

/** Meetings in the order they occur in the week. */
export function sortMeetings(meetings = []) {
  return [...meetings].sort((x, y) => x.day - y.day || x.start - y.start);
}

/**
 * "Mon & Wed · 18:00–19:30" in whatever language is being read. Slots that
 * share a time are gathered together, because that is how anybody would say
 * it out loud; the rest are listed separately.
 */
export function scheduleText(course, t, locale = "en") {
  const meetings = sortMeetings(course?.meetings || []);
  if (!meetings.length) return course?.schedule || "";
  const span = course.sessionMin || 90;

  const byTime = new Map();
  for (const m of meetings) {
    if (!byTime.has(m.start)) byTime.set(m.start, []);
    byTime.get(m.start).push(m.day);
  }

  const and = t("common.and") || "&";
  return [...byTime.entries()]
    .sort((x, y) => x[0] - y[0])
    .map(([start, days]) => {
      const names = days.map((d) => t(`weekdays.short.${DAY_KEYS[d]}`)).join(` ${and} `);
      const from = formatTime(at("2026-01-05", start), locale);
      const to = formatTime(at("2026-01-05", Math.min(1439, start + span)), locale);
      // Isolated so that the clock reads left to right inside an Arabic line.
      return `${names} · \u2066${from}–${to}\u2069`;
    })
    .join(" · ");
}

/* ------------------------------------------------------------------ colour */

/**
 * A course keeps the same colour wherever it appears, taken from its id so
 * that nothing has to be stored and everyone sees the same timetable. The set
 * is deliberately quiet: these are labels, not traffic lights.
 */
export const COURSE_COLOURS = [
  { bar: "#2a4b6e", tint: "#eef2f7", ink: "#12243b" },
  { bar: "#1f6f5c", tint: "#e9f3f0", ink: "#12463a" },
  { bar: "#9a7526", tint: "#f7f2e4", ink: "#6a4f16" },
  { bar: "#7a4b78", tint: "#f4eef4", ink: "#4e2d4d" },
  { bar: "#a04a3c", tint: "#f8eeec", ink: "#6d2f25" },
  { bar: "#3c6b8f", tint: "#eef3f7", ink: "#234862" },
  { bar: "#5f6b35", tint: "#f1f3e9", ink: "#3d4622" },
  { bar: "#8a5a2b", tint: "#f7f0e8", ink: "#5a3819" },
];

export function colourFor(id) {
  const s = String(id || "");
  let sum = 0;
  for (let i = 0; i < s.length; i += 1) sum = (sum * 31 + s.charCodeAt(i)) % 100000;
  return COURSE_COLOURS[sum % COURSE_COLOURS.length];
}
