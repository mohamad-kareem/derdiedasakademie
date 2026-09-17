import { redirect } from "next/navigation";

// Old route — the landing page is now app/page.js.
export default function LegacyLandingPage() {
  redirect("/");
}
