import { NextResponse } from "next/server";
import { getPublishedCourses } from "@/lib/data";
import { getI18n } from "@/lib/i18n/server";
import { scheduleText } from "@/lib/schedule";

// Public, read-only list of published courses (e.g. for integrations).
export async function GET(request) {
  try {
    const level = request.nextUrl.searchParams.get("level") || undefined;
    const [courses, { t, locale }] = await Promise.all([getPublishedCourses({ level, upcomingOnly: true }), getI18n()]);
    return NextResponse.json({
      courses: courses.map((c) => ({
        id: c._id,
        title: c.title,
        level: c.level,
        format: c.format,
        schedule: scheduleText(c, t, locale),
        meetings: c.meetings || [],
        sessionMin: c.sessionMin || 90,
        startDate: c.startDate,
        endDate: c.endDate,
        price: c.price,
        currency: c.currency,
        seatsLeft: c.seatsLeft,
      })),
    });
  } catch (error) {
    console.error("GET_COURSES_ERROR:", error);
    return NextResponse.json({ message: "Server error." }, { status: 500 });
  }
}
