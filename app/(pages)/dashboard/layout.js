import PortalShell from "@/components/portal/PortalShell";
import { requireStudent } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";

export default async function StudentLayout({ children }) {
  const user = await requireStudent();
  const { t } = await getI18n();
  const nav = [
    { href: "/dashboard", label: t("student.nav.overview"), icon: "dashboard" },
    { href: "/dashboard/courses", label: t("student.nav.courses"), icon: "courses" },
    { href: "/dashboard/assignments", label: t("student.nav.assignments"), icon: "assignments" },
    { href: "/courses", label: t("student.nav.browse"), icon: "learn" },
    { href: "/dashboard/profile", label: t("student.nav.profile"), icon: "profile" },
  ];
  return (
    <PortalShell nav={nav} user={user} home="/dashboard" roleLabel={t("student.portal")}>
      {children}
    </PortalShell>
  );
}
