import { redirect } from "next/navigation";

// Old route — the admin area now lives at /admin.
export default function LegacyAdminCourses() {
  redirect("/admin/courses");
}
