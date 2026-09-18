import { PageHeader, Breadcrumb } from "@/components/ui/Blocks";
import ProfileForms from "@/components/portal/ProfileForms";
import { requireAdmin } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";

export default async function AdminSettingsPage() {
  const user = await requireAdmin();
  const { t } = await getI18n();
  return (
    <>
      <PageHeader title={t("admin.nav.settings")} description={t("admin.settings.subtitle")} >
        <Breadcrumb trail={[t("admin.portal"), t("admin.nav.settings")]} />
      </PageHeader>
      <ProfileForms user={user} />
      <div className="card mt-6 p-5 text-sm text-muted">
        <h2 className="mb-2 text-sm font-semibold text-navy-900">{t("admin.settings.siteTitle")}</h2>
        <p>{t("admin.settings.siteText")}</p>
      </div>
    </>
  );
}
