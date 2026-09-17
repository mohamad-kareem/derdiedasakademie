import { PageHeader, Panel } from "@/components/ui/Blocks";
import ProfileForms from "@/components/portal/ProfileForms";
import { requireStudent } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";

export default async function ProfilePage() {
  const user = await requireStudent();
  const { t } = await getI18n();
  return (
    <>
      <PageHeader title={t("student.nav.profile")} description={t("profile.subtitle")} />
      <ProfileForms user={user} showLevel />
    </>
  );
}
