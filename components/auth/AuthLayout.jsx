import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Logo from "@/components/Logo";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { getI18n } from "@/lib/i18n/server";

export default async function AuthLayout({ title, subtitle, children }) {
  const { t } = await getI18n();
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-navy-950 lg:block">
        <Image src="/logo/login.jpg" alt="" fill priority sizes="50vw" className="object-cover opacity-55" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-950/40 to-navy-950/20" />
        <div className="absolute inset-x-0 bottom-0 p-12 text-white">
          <div className="flag-stripe mb-6 h-1 w-16 rounded-full" />
          <p className="max-w-md font-display text-3xl font-semibold leading-snug">{t("auth.quote")}</p>
          <p className="mt-4 max-w-md text-sm text-white/65">{t("auth.quoteSub")}</p>
        </div>
      </div>
      <div className="flex flex-col bg-paper">
        <div className="flex items-center justify-between px-6 py-5 sm:px-10">
          <Logo />
          <LanguageSwitcher />
        </div>
        <div className="flex flex-1 items-center justify-center px-6 py-10 sm:px-10">
          <div className="w-full max-w-md">
            <Link href="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-navy-900">
              <ArrowLeft className="size-4 rtl:rotate-180" /> {t("auth.backHome")}
            </Link>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-navy-900">{title}</h1>
            {subtitle && <p className="mt-2 text-sm text-muted">{subtitle}</p>}
            <div className="mt-8">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
