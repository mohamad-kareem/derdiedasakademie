import { redirect } from "next/navigation";

// Old route — replaced by /courses.
export default function LegacyChooseCourse() {
  redirect("/courses");
}
