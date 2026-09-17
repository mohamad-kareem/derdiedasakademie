import connectDB from "@/lib/mongodb";
import Course from "@/models/Course";
import Enrollment from "@/models/Enrollment";
import { LEVELS } from "@/lib/constants";
import { plain } from "@/lib/utils";

async function withSeats(courses) {
  if (!courses.length) return [];
  const counts = await Enrollment.aggregate([
    { $match: { course: { $in: courses.map((c) => c._id) }, status: { $in: ["active", "pending"] } } },
    { $group: { _id: "$course", n: { $sum: 1 } } },
  ]);
  const map = Object.fromEntries(counts.map((c) => [String(c._id), c.n]));
  return plain(courses).map((c) => ({ ...c, seatsLeft: Math.max(0, c.capacity - (map[c._id] || 0)) }));
}

export async function getPublishedCourses({ level, limit, upcomingOnly = false } = {}) {
  await connectDB();
  const query = { status: "published" };
  if (LEVELS.includes(level)) query.level = level;
  if (upcomingOnly) query.endDate = { $gte: new Date() };
  let q = Course.find(query).sort({ startDate: 1 });
  if (limit) q = q.limit(limit);
  return withSeats(await q.lean());
}

export async function getPublishedCourse(id) {
  await connectDB();
  const course = await Course.findOne({ _id: id, status: "published" }).lean();
  if (!course) return null;
  const [withSeat] = await withSeats([course]);
  return withSeat;
}

// Never let a database hiccup take down marketing pages.
export async function safe(promise, fallback) {
  try {
    return await promise;
  } catch (err) {
    console.error("[data]", err?.message || err);
    return fallback;
  }
}
