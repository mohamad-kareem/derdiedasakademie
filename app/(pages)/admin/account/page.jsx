import { PageHeader, Breadcrumb } from "@/components/ui/Blocks";
import ProfileForms from "@/components/portal/ProfileForms";
import { requireStaff } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { portalKey } from "@/lib/roles";

/** A staff member's own details and password — everyone who works here has one. */
export default async function StaffAccountPage() {
  const user = await requireStaff();
  const { t } = await getI18n();
  return (
    <>
      <PageHeader title={t("admin.account.title")} description={t("admin.account.subtitle")}>
        <Breadcrumb trail={[t(portalKey(user)), t("admin.account.title")]} />
      </PageHeader>
      <ProfileForms user={user} />
    </>
  );
}
