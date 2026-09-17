"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ExternalLink, LogOut } from "lucide-react";
import Logo from "@/components/Logo";
import Icon from "@/components/ui/Icon";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useI18n } from "@/components/I18nProvider";
import { logoutAction } from "@/app/actions/auth";
import { cn, initials } from "@/lib/utils";

export default function PortalShell({ nav, user, home, roleLabel, children }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href) => (href === home ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between px-5">
        <Logo href={home} dark />
        <button type="button" className="text-white/60 lg:hidden" onClick={() => setOpen(false)} aria-label="Close">
          <X className="size-5" />
        </button>
      </div>
      <div className="flag-stripe mx-5 h-0.5 rounded-full opacity-80" />
      <p className="px-5 pb-2 pt-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">{roleLabel}</p>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
        {nav.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "group flex items-center gap-3 rounded-md px-3 py-2 text-[13.5px] font-medium transition",
                active ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon name={item.icon} className={cn("size-[18px]", active ? "text-gold-400" : "text-white/45 group-hover:text-white/80")} />
              <span className="flex-1">{item.label}</span>
              {item.badge > 0 && <span className="rounded-full bg-gold-500 px-1.5 text-[10px] font-bold leading-4 text-white">{item.badge}</span>}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-3 rounded-md px-2 py-2">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gold-500 text-xs font-bold text-white">{initials(user.name)}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{user.name}</p>
            <p className="truncate text-xs text-white/45">{user.email}</p>
          </div>
          <form action={logoutAction}>
            <button type="submit" className="rounded-md p-2 text-white/50 hover:bg-white/10 hover:text-white" title={t("nav.logout")} aria-label={t("nav.logout")}>
              <LogOut className="size-4 rtl:rotate-180" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-canvas">
      <aside className="fixed inset-y-0 start-0 z-40 hidden w-64 bg-navy-950 lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-navy-950/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 start-0 w-72 bg-navy-950 shadow-2xl">{sidebar}</aside>
        </div>
      )}
      <div className="lg:ps-64">
        <header className="no-print sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-white/90 px-4 backdrop-blur sm:px-6">
          <button type="button" className="btn btn-ghost size-9 px-0 lg:hidden" onClick={() => setOpen(true)} aria-label="Menu">
            <Menu className="size-5" />
          </button>
          <div className="lg:hidden"><Logo href={home} compact /></div>
          <div className="ms-auto flex items-center gap-1">
            <Link href="/" className="btn btn-ghost btn-sm hidden sm:inline-flex">
              <ExternalLink className="size-3.5" /> {t("nav.website")}
            </Link>
            <LanguageSwitcher />
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
