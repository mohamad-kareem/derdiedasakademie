import PortalShell from "@/components/portal/PortalShell";
import { requireAdmin } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import Enrollment from "@/models/Enrollment";
import Submission from "@/models/Submission";
import Inquiry from "@/models/Inquiry";

export default async function AdminLayout({ children }) {
  const user = await requireAdmin();
  const { t } = await getI18n();
  const [pending, toGrade, inquiries] = await Promise.all([
    Enrollment.countDocuments({ status: "pending" }),
    Submission.countDocuments({ status: "submitted" }),
    Inquiry.countDocuments({ status: "new" }),
  ]);
  const nav = [
    { href: "/admin", label: t("admin.nav.overview"), icon: "dashboard" },
    { href: "/admin/courses", label: t("admin.nav.courses"), icon: "courses" },
    { href: "/admin/enrollments", label: t("admin.nav.enrollments"), icon: "enrollments", badge: pending },
    { href: "/admin/students", label: t("admin.nav.students"), icon: "students" },
    { href: "/admin/grading", label: t("admin.nav.grading"), icon: "grading", badge: toGrade },
    { href: "/admin/announcements", label: t("admin.nav.announcements"), icon: "announcements" },
    { href: "/admin/inquiries", label: t("admin.nav.inquiries"), icon: "inbox", badge: inquiries },
    { href: "/admin/settings", label: t("admin.nav.settings"), icon: "settings" },
  ];
  return (
    <PortalShell nav={nav} user={user} home="/admin" roleLabel={t("admin.portal")}>
      {children}
    </PortalShell>
  );
}
