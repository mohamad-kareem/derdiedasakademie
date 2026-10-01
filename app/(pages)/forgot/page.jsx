import { redirect } from "next/navigation";
import AuthLayout from "@/components/auth/AuthLayout";
import ForgotForm from "@/components/auth/ForgotForm";
import { getI18n } from "@/lib/i18n/server";
import { getCurrentUser } from "@/lib/auth";
import { safe } from "@/lib/data";
import { homeFor } from "@/lib/roles";
import { isEmailConfigured } from "@/lib/email";
import { site } from "@/lib/site";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("auth.reset.title") };
}

export default async function ForgotPage() {
  const user = await safe(getCurrentUser(), null);
  if (user) redirect(homeFor(user));
  const { t } = await getI18n();

  return (
    <AuthLayout title={t("auth.reset.title")} subtitle={t("auth.reset.subtitle")}>
      {isEmailConfigured() ? (
        <ForgotForm />
      ) : (
        // With no post room there is no point pretending a letter is coming.
        <p className="rounded-[3px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {t("auth.reset.noEmail", { contact: site.email || site.phone || "" })}
        </p>
      )}
    </AuthLayout>
  );
}
