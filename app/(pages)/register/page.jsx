import { redirect } from "next/navigation";
import AuthLayout from "@/components/auth/AuthLayout";
import RegisterForm from "@/components/auth/RegisterForm";
import { getI18n } from "@/lib/i18n/server";
import { getCurrentUser } from "@/lib/auth";
import { safe } from "@/lib/data";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("auth.createAccount") };
}

export default async function RegisterPage({ searchParams }) {
  const { next } = await searchParams;
  const user = await safe(getCurrentUser(), null);
  if (user) redirect(user.role === "admin" ? "/admin" : "/dashboard");
  const { t } = await getI18n();
  return (
    <AuthLayout title={t("auth.registerTitle")} subtitle={t("auth.registerSubtitle")}>
      <RegisterForm next={typeof next === "string" ? next : ""} />
    </AuthLayout>
  );
}
