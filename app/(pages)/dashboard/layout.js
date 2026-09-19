import { cookies } from "next/headers";
import PortalShell from "@/components/portal/PortalShell";
import { requireStudent } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";

export default async function StudentLayout({ children }) {
  const user = await requireStudent();
  const { t } = await getI18n();
  const jar = await cookies();

  // Four destinations need no grouping; the profile moved to the masthead menu.
  const nav = [
    { href: "/dashboard", label: t("student.nav.overview"), icon: "dashboard" },
    { href: "/dashboard/courses", label: t("student.nav.courses"), icon: "courses" },
    { href: "/dashboard/assignments", label: t("student.nav.assignments"), icon: "assignments" },
    { href: "/courses", label: t("student.nav.browse"), icon: "learn" },
  ];

  return (
    <PortalShell
      nav={nav}
      user={user}
      home="/dashboard"
      roleLabel={t("student.portal")}
      profileHref="/dashboard/profile"
      defaultCollapsed={jar.get("ddd_nav")?.value === "mini"}
    >
      {children}
    </PortalShell>
  );
}
