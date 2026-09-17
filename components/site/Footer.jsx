import Link from "next/link";
import { Mail, Phone } from "lucide-react";
import { FaInstagram, FaTiktok, FaFacebookF } from "react-icons/fa";
import Logo from "@/components/Logo";
import { getI18n } from "@/lib/i18n/server";
import { site } from "@/lib/site";
import { LEVELS } from "@/lib/constants";

export default async function Footer() {
  const { t } = await getI18n();
  const year = new Date().getFullYear();
  return (
    <footer className="bg-navy-950 text-white/70">
      <div className="container-page grid gap-10 py-14 md:grid-cols-12">
        <div className="md:col-span-4">
          <Logo dark />
          <p className="mt-5 max-w-xs text-sm leading-relaxed">{t("footer.about")}</p>
          <div className="mt-5 flex gap-2">
            {[
              { href: site.instagram, icon: FaInstagram, label: "Instagram" },
              { href: site.tiktok, icon: FaTiktok, label: "TikTok" },
              { href: site.facebook, icon: FaFacebookF, label: "Facebook" },
            ].map(({ href, icon: I, label }) => (
              <a key={label} href={href} aria-label={label} className="flex size-9 items-center justify-center rounded-md border border-white/10 text-white/70 transition hover:border-gold-400 hover:text-gold-400">
                <I className="size-3.5" />
              </a>
            ))}
          </div>
        </div>
        <div className="md:col-span-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-white">{t("footer.academy")}</h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><Link className="hover:text-white" href="/courses">{t("nav.courses")}</Link></li>
            <li><Link className="hover:text-white" href="/#method">{t("nav.method")}</Link></li>
            <li><Link className="hover:text-white" href="/#about">{t("nav.about")}</Link></li>
            <li><Link className="hover:text-white" href="/#faq">{t("nav.faq")}</Link></li>
          </ul>
        </div>
        <div className="md:col-span-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-white">{t("footer.levels")}</h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            {LEVELS.map((l) => (
              <li key={l}><Link className="hover:text-white" href={`/courses?level=${l}`}>{t("footer.germanLevel", { level: l })}</Link></li>
            ))}
          </ul>
        </div>
        <div className="md:col-span-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-white">{t("footer.contact")}</h3>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex items-center gap-2.5"><Mail className="size-4 text-gold-400" /><a href={`mailto:${site.email}`} className="hover:text-white">{site.email}</a></li>
            <li className="flex items-center gap-2.5"><Phone className="size-4 text-gold-400" /><span dir="ltr">{site.phone}</span></li>
          </ul>
          <Link href="/#contact" className="btn btn-gold mt-5">{t("footer.consultation")}</Link>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-2 py-5 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} {site.name}. {t("footer.rights")}</p>
          <div className="flex gap-4">
            <Link href="/login" className="hover:text-white">{t("nav.login")}</Link>
            <Link href="/register" className="hover:text-white">{t("nav.getStarted")}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
