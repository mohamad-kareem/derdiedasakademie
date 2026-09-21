import { cookies } from "next/headers";
import PortalShell from "@/components/portal/PortalShell";
import { requireStaff } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { can, isOwner, ownCoursesFilter } from "@/lib/roles";
import Course from "@/models/Course";
import Enrollment from "@/models/Enrollment";
import Submission from "@/models/Submission";
import Inquiry from "@/models/Inquiry";

/**
 * The staff shell.
 *
 * The navigation is built from what this person may actually do, so a teacher
 * is never shown a door that would refuse them. The counts beside an entry are
 * scoped the same way: a teacher's grading figure counts their own courses.
 */
export default async function AdminLayout({ children }) {
  const user = await requireStaff();
  const { t } = await getI18n();
  const owner = isOwner(user);

  const mine = owner ? null : (await Course.find(ownCoursesFilter(user)).select("_id").lean()).map((c) => c._id);
  const scope = owner ? {} : { course: { $in: mine } };

  const [pending, toGrade, inquiries, jar] = await Promise.all([
    owner ? Enrollment.countDocuments({ status: "pending" }) : 0,
    Submission.countDocuments({ ...scope, status: "submitted" }),
    owner ? Inquiry.countDocuments({ status: "new" }) : 0,
    cookies(),
  ]);

  const teaching = t("admin.nav.groups.teaching");
  const community = t("admin.nav.groups.community");
  const system = t("admin.nav.groups.system");

  const nav = [
    { href: "/admin", label: t("admin.nav.overview"), icon: "dashboard" },
    { href: "/admin/courses", label: t("admin.nav.courses"), icon: "courses", section: teaching },
    can(user, "enrollments.decide") && {
      href: "/admin/enrollments", label: t("admin.nav.enrollments"), icon: "enrollments", badge: pending, section: teaching,
    },
    { href: "/admin/students", label: t("admin.nav.students"), icon: "students", section: teaching },
    { href: "/admin/grading", label: t("admin.nav.grading"), icon: "grading", badge: toGrade, section: teaching },
    { href: "/admin/announcements", label: t("admin.nav.announcements"), icon: "announcements", section: community },
    can(user, "inquiries.manage") && {
      href: "/admin/inquiries", label: t("admin.nav.inquiries"), icon: "inbox", badge: inquiries, section: community,
    },
    can(user, "staff.manage") && { href: "/admin/staff", label: t("admin.nav.staff"), icon: "staff", section: system },
    can(user, "usage.view") && { href: "/admin/usage", label: t("admin.nav.usage"), icon: "usage", section: system },
    can(user, "system.settings") && { href: "/admin/settings", label: t("admin.nav.settings"), icon: "settings", section: system },
  ].filter(Boolean);

  return (
    <PortalShell
      nav={nav}
      user={user}
      home="/admin"
      roleLabel={t(owner ? "admin.portal" : "admin.teacherPortal")}
      profileHref="/admin/account"
      defaultCollapsed={jar.get("ddd_nav")?.value === "mini"}
    >
      {children}
    </PortalShell>
  );
}
