"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X, ArrowRight, Mail, Phone } from "lucide-react";
import Logo from "@/components/Logo";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useI18n } from "@/components/I18nProvider";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";

export default function Navbar({ user }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { href: "/courses", label: t("nav.courses") },
    { href: "/level-test", label: t("nav.levelTest") },
    { href: "/#levels", label: t("nav.levels") },
    { href: "/#method", label: t("nav.method") },
    { href: "/#about", label: t("nav.about") },
    { href: "/#faq", label: t("nav.faq") },
    { href: "/#contact", label: t("nav.contact") },
  ];
  const portal = user ? (user.role === "admin" ? "/admin" : "/dashboard") : null;

  return (
    <header className={cn("sticky top-0 z-50 bg-paper", scrolled && "shadow-[0_1px_0_rgba(0,0,0,0.04)]")}>
      {/* a slim official band: how to reach the academy, and the language */}
      <div className="hidden bg-navy-950 text-white/65 sm:block">
        <div className="container-page flex h-8 items-center justify-between gap-4 text-[12px]">
          <div className="flex items-center gap-4">
            <a href={`mailto:${site.email}`} className="inline-flex items-center gap-1.5 hover:text-white">
              <Mail className="size-3.5" /> {site.email}
            </a>
            <span className="inline-flex items-center gap-1.5" dir="ltr">
              <Phone className="size-3.5" /> {site.phone}
            </span>
          </div>
          <LanguageSwitcher variant="dark" />
        </div>
      </div>
      <nav className="container-page flex h-14 items-center justify-between gap-4">
        <Logo />
        <div className="hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-[2px] px-2.5 py-1.5 text-[13px] font-medium text-ink/75 transition-colors hover:bg-navy-50 hover:text-navy-900">
              {l.label}
            </Link>
          ))}
        </div>
        <div className="hidden items-center gap-2 lg:flex">
          {portal ? (
            <Link href={portal} className="btn btn-primary">
              {t("nav.myPortal")} <ArrowRight className="size-4 rtl:rotate-180" />
            </Link>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost">{t("nav.login")}</Link>
              <Link href="/register" className="btn btn-primary">{t("nav.getStarted")}</Link>
            </>
          )}
        </div>
        <div className="flex items-center gap-1 lg:hidden">
          <LanguageSwitcher />
          <button type="button" onClick={() => setOpen((v) => !v)} className="btn btn-outline size-9 px-0" aria-label="Menu" aria-expanded={open}>
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </nav>
      <div className="flag-stripe h-[3px] w-full" />
      {open && (
        <div className="border-t border-line bg-paper lg:hidden">
          <div className="container-page flex flex-col gap-1 py-4">
            {links.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-[3px] px-3 py-2.5 text-sm font-medium text-ink hover:bg-navy-50">
                {l.label}
              </Link>
            ))}
            <div className="mt-3 grid grid-cols-2 gap-2">
              {portal ? (
                <Link href={portal} className="btn btn-primary col-span-2">{t("nav.myPortal")}</Link>
              ) : (
                <>
                  <Link href="/login" className="btn btn-outline">{t("nav.login")}</Link>
                  <Link href="/register" className="btn btn-primary">{t("nav.getStarted")}</Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
