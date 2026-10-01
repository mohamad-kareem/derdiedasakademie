import Link from "next/link";
import AuthLayout from "@/components/auth/AuthLayout";
import ResetForm from "@/components/auth/ResetForm";
import { getI18n } from "@/lib/i18n/server";
import connectDB from "@/lib/mongodb";
import { accountForToken } from "@/lib/tokens";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("auth.reset.choose") };
}

/**
 * Choosing a new password.
 *
 * The link is checked here, before the form is drawn, so that somebody with a
 * stale link is told so straight away rather than after typing a password
 * twice. It is checked again when the form is sent, because a page that has
 * been sitting open is not proof of anything.
 */
export default async function ResetPage({ params }) {
  const { token } = await params;
  const { t } = await getI18n();
  await connectDB();
  const user = await accountForToken(token);

  if (!user) {
    return (
      <AuthLayout title={t("auth.reset.badLinkTitle")} subtitle={t("auth.reset.badLinkText")}>
        <div className="space-y-3">
          <Link href="/forgot" className="btn btn-primary btn-lg w-full">{t("auth.reset.send")}</Link>
          <Link href="/login" className="btn btn-outline w-full">{t("auth.login")}</Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={t("auth.reset.choose")} subtitle={t("auth.reset.chooseFor", { email: user.email })}>
      <ResetForm token={token} />
    </AuthLayout>
  );
}
