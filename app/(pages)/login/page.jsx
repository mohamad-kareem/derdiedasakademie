import { redirect } from "next/navigation";
import AuthLayout from "@/components/auth/AuthLayout";
import LoginForm from "@/components/auth/LoginForm";
import { getI18n } from "@/lib/i18n/server";
import { getCurrentUser } from "@/lib/auth";
import { safe } from "@/lib/data";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("auth.login") };
}

export default async function LoginPage({ searchParams }) {
  const { next } = await searchParams;
  const user = await safe(getCurrentUser(), null);
  if (user) redirect(user.role === "admin" ? "/admin" : "/dashboard");
  const { t } = await getI18n();
  return (
    <AuthLayout title={t("auth.welcomeBack")} subtitle={t("auth.loginSubtitle")}>
      <LoginForm next={typeof next === "string" ? next : ""} />
    </AuthLayout>
  );
}
