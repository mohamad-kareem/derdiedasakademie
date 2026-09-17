import Link from "next/link";
import Logo from "@/components/Logo";
import { getI18n } from "@/lib/i18n/server";

export default async function NotFound() {
  const { t } = await getI18n();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream px-6 text-center">
      <Logo />
      <p className="mt-10 font-display text-7xl font-semibold text-navy-900">404</p>
      <h1 className="mt-3 text-xl font-semibold text-navy-900">{t("notFound.title")}</h1>
      <p className="mt-2 max-w-sm text-sm text-muted">{t("notFound.text")}</p>
      <Link href="/" className="btn btn-primary mt-6">{t("auth.backHome")}</Link>
    </div>
  );
}
