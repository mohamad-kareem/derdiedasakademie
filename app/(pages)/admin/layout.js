import { cookies } from "next/headers";
import PortalShell from "@/components/portal/PortalShell";
import { requireAdmin } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import Enrollment from "@/models/Enrollment";
import Submission from "@/models/Submission";
import Inquiry from "@/models/Inquiry";

export default async function AdminLayout({ children }) {
  const user = await requireAdmin();
  const { t } = await getI18n();
  const [pending, toGrade, inquiries, jar] = await Promise.all([
    Enrollment.countDocuments({ status: "pending" }),
    Submission.countDocuments({ status: "submitted" }),
    Inquiry.countDocuments({ status: "new" }),
    cookies(),
  ]);

  const teaching = t("admin.nav.groups.teaching");
  const community = t("admin.nav.groups.community");
  const system = t("admin.nav.groups.system");

  const nav = [
    { href: "/admin", label: t("admin.nav.overview"), icon: "dashboard" },
    { href: "/admin/courses", label: t("admin.nav.courses"), icon: "courses", section: teaching },
    { href: "/admin/enrollments", label: t("admin.nav.enrollments"), icon: "enrollments", badge: pending, section: teaching },
    { href: "/admin/students", label: t("admin.nav.students"), icon: "students", section: teaching },
    { href: "/admin/grading", label: t("admin.nav.grading"), icon: "grading", badge: toGrade, section: teaching },
    { href: "/admin/announcements", label: t("admin.nav.announcements"), icon: "announcements", section: community },
    { href: "/admin/inquiries", label: t("admin.nav.inquiries"), icon: "inbox", badge: inquiries, section: community },
    { href: "/admin/usage", label: t("admin.nav.usage"), icon: "usage", section: system },
    { href: "/admin/settings", label: t("admin.nav.settings"), icon: "settings", section: system },
  ];

  return (
    <PortalShell
      nav={nav}
      user={user}
      home="/admin"
      roleLabel={t("admin.portal")}
      profileHref={null}
      defaultCollapsed={jar.get("ddd_nav")?.value === "mini"}
    >
      {children}
    </PortalShell>
  );
}
