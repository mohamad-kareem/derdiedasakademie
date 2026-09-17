import { NextResponse } from "next/server";
import { getPublishedCourses } from "@/lib/data";

// Public, read-only list of published courses (e.g. for integrations).
export async function GET(request) {
  try {
    const level = request.nextUrl.searchParams.get("level") || undefined;
    const courses = await getPublishedCourses({ level, upcomingOnly: true });
    return NextResponse.json({
      courses: courses.map(({ _id, title, level, format, schedule, startDate, endDate, price, currency, seatsLeft }) => ({
        id: _id, title, level, format, schedule, startDate, endDate, price, currency, seatsLeft,
      })),
    });
  } catch (error) {
    console.error("GET_COURSES_ERROR:", error);
    return NextResponse.json({ message: "Server error." }, { status: 500 });
  }
}
