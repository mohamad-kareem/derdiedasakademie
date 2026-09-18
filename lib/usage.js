import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import { BUCKET_NAME } from "@/lib/storage";
import Attendance from "@/models/Attendance";
import Lesson from "@/models/Lesson";
import Course from "@/models/Course";
import User from "@/models/User";

/**
 * Everything the admin Usage page needs.
 *
 * Three independent sources, each read on its own so one failure never blanks
 * the whole page:
 *   • files   — measured inside MongoDB (exact)
 *   • traffic — measured on the video server by vnstat (exact, the same bytes
 *               Oracle counts against the free allowance)
 *   • classes — measured from attendance records (exact)
 *
 * The grouping is done here in plain JavaScript rather than in aggregation
 * pipelines: the volumes are small (a few thousand rows a month at most) and it
 * keeps the queries to operators every MongoDB-compatible database supports.
 */

/** MongoDB Atlas free tier. */
export const DB_LIMIT_BYTES = Number(process.env.DB_LIMIT_MB || 512) * 1024 * 1024;
/** Oracle Always Free outbound allowance, per calendar month. */
export const TRAFFIC_LIMIT_BYTES = Number(process.env.TRAFFIC_LIMIT_TB || 10) * 1024 ** 4;

function monthStart(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function daysInMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

function pct(used, limit) {
  if (!limit) return 0;
  return Math.min(100, Math.round((used / limit) * 1000) / 10);
}

/* ------------------------------------------------------------------ files */

export async function getStorageUsage() {
  try {
    await connectDB();
    const db = mongoose.connection.db;

    const [files, stats, leftovers] = await Promise.all([
      db
        .collection(`${BUCKET_NAME}.files`)
        .find({}, { projection: { filename: 1, length: 1, uploadDate: 1, metadata: 1 } })
        .toArray(),
      db.command({ dbStats: 1 }).catch(() => ({})),
      db.command({ collStats: "uploadchunks" }).catch(() => null),
    ]);

    const areas = new Map();
    let fileBytes = 0;
    for (const f of files) {
      const bytes = f.length || 0;
      fileBytes += bytes;
      const area = String(f.filename || "").split("/")[0] || "other";
      const row = areas.get(area) || { area, bytes: 0, count: 0 };
      row.bytes += bytes;
      row.count += 1;
      areas.set(area, row);
    }

    const largest = [...files]
      .sort((a, b) => (b.length || 0) - (a.length || 0))
      .slice(0, 8)
      .map((f) => ({
        name: f.metadata?.name || String(f.filename || "").split("/").pop() || "—",
        key: String(f._id),
        bytes: f.length || 0,
        uploadedAt: f.uploadDate ? new Date(f.uploadDate).toISOString() : null,
      }));

    const dbUsed = (stats?.dataSize || 0) + (stats?.indexSize || 0);

    return {
      ok: true,
      fileBytes,
      fileCount: files.length,
      dbUsedBytes: dbUsed,
      dbLimitBytes: DB_LIMIT_BYTES,
      dbPercent: pct(dbUsed, DB_LIMIT_BYTES),
      areas: [...areas.values()].sort((a, b) => b.bytes - a.bytes),
      largest,
      leftoverChunkBytes: leftovers?.size || 0,
      leftoverChunkCount: leftovers?.count || 0,
    };
  } catch (err) {
    return { ok: false, error: err?.message || "database unavailable" };
  }
}

/* ---------------------------------------------------------------- traffic */

export function isTrafficConfigured() {
  return Boolean(process.env.SERVER_USAGE_URL && process.env.SERVER_USAGE_TOKEN);
}

export async function getTrafficUsage() {
  if (!isTrafficConfigured()) return { ok: false, configured: false };
  try {
    const res = await fetch(process.env.SERVER_USAGE_URL, {
      headers: { Authorization: `Bearer ${process.env.SERVER_USAGE_TOKEN}` },
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 300 },
    });
    if (!res.ok) {
      return { ok: false, configured: true, error: res.status === 401 ? "the server rejected the token" : `the server answered ${res.status}` };
    }
    const data = await res.json();

    const now = new Date();
    const dayOfMonth = now.getDate();
    const total = daysInMonth(now);
    const monthTx = data.month?.txBytes || 0;
    const projected = dayOfMonth > 0 ? Math.round((monthTx / dayOfMonth) * total) : 0;

    return {
      ok: true,
      configured: true,
      generatedAt: data.generatedAt || null,
      countingSince: data.countingSince || null,
      monthTxBytes: monthTx,
      monthRxBytes: data.month?.rxBytes || 0,
      todayTxBytes: data.today?.txBytes || 0,
      limitBytes: TRAFFIC_LIMIT_BYTES,
      percent: pct(monthTx, TRAFFIC_LIMIT_BYTES),
      projectedBytes: projected,
      projectedPercent: pct(projected, TRAFFIC_LIMIT_BYTES),
      dayOfMonth,
      daysInMonth: total,
      days: (data.days || []).slice(-14),
      months: (data.months || []).slice(-6),
      system: data.system || {},
    };
  } catch (err) {
    const timedOut = err?.name === "TimeoutError" || err?.name === "AbortError";
    return {
      ok: false,
      configured: true,
      error: timedOut ? "the video server did not answer in time" : err?.message || "could not reach the video server",
    };
  }
}

/* ---------------------------------------------------------------- classes */

export async function getTeachingUsage() {
  try {
    await connectDB();
    const from = monthStart();

    const [rows, lessonsHeld, admins] = await Promise.all([
      Attendance.find({ updatedAt: { $gte: from } }, { lesson: 1, course: 1, user: 1, seconds: 1 }).lean(),
      Lesson.countDocuments({ startsAt: { $gte: from, $lte: new Date() } }),
      User.find({ role: "admin" }, { _id: 1 }).lean(),
    ]);
    // Teachers sit in the same attendance records as everyone else. Their minutes
    // still count towards time and traffic, but they are not students.
    const teachers = new Set(admins.map((a) => String(a._id)));

    const lessons = new Map();
    const perCourse = new Map();
    const learners = new Set();

    for (const r of rows) {
      const seconds = r.seconds || 0;
      const lessonId = String(r.lesson);
      const courseId = String(r.course);
      const userId = String(r.user);
      if (!teachers.has(userId)) learners.add(userId);

      const lesson = lessons.get(lessonId) || { people: 0, personSeconds: 0, longest: 0 };
      lesson.people += 1;
      lesson.personSeconds += seconds;
      lesson.longest = Math.max(lesson.longest, seconds);
      lessons.set(lessonId, lesson);

      const course = perCourse.get(courseId) || { id: courseId, personSeconds: 0, learners: new Set() };
      course.personSeconds += seconds;
      if (!teachers.has(userId)) course.learners.add(userId);
      perCourse.set(courseId, course);
    }

    const all = [...lessons.values()];
    const personSeconds = all.reduce((sum, l) => sum + l.personSeconds, 0);
    const classSeconds = all.reduce((sum, l) => sum + l.longest, 0);
    const people = all.reduce((sum, l) => sum + l.people, 0);

    const top = [...perCourse.values()].sort((a, b) => b.personSeconds - a.personSeconds).slice(0, 8);
    const titles = top.length
      ? await Course.find({ _id: { $in: top.map((c) => c.id) } }, { title: 1, level: 1 }).lean()
      : [];
    const titleById = new Map(titles.map((c) => [String(c._id), c]));

    return {
      ok: true,
      from: from.toISOString(),
      personMinutes: Math.round(personSeconds / 60),
      classMinutes: Math.round(classSeconds / 60),
      lessonsHeld,
      lessonsAttended: all.length,
      learners: learners.size,
      averageClassSize: all.length ? Math.round((people / all.length) * 10) / 10 : 0,
      courses: top.map((c) => ({
        id: c.id,
        title: titleById.get(c.id)?.title || "—",
        level: titleById.get(c.id)?.level || "",
        personMinutes: Math.round(c.personSeconds / 60),
        learners: c.learners.size,
      })),
    };
  } catch (err) {
    return { ok: false, error: err?.message || "database unavailable" };
  }
}

/* ------------------------------------------------------------- everything */

export async function getUsageReport() {
  const [storage, traffic, teaching] = await Promise.all([getStorageUsage(), getTrafficUsage(), getTeachingUsage()]);

  // What one person-minute of class actually costs in traffic — measured rather
  // than guessed. Only meaningful once both figures cover the same month.
  let bytesPerPersonMinute = null;
  if (traffic.ok && teaching.ok && teaching.personMinutes > 0) {
    bytesPerPersonMinute = Math.round(traffic.monthTxBytes / teaching.personMinutes);
  }

  return { storage, traffic, teaching, bytesPerPersonMinute };
}
