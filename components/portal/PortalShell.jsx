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

/**
 * The administrative shell.
 *
 * A dark masthead runs the full width of the window and carries the academy's
 * name, in the manner of an official portal; the navigation column sits beneath
 * it in a lighter tone so the two read as separate bands rather than one slab.
 * The current section is marked with a brass rule, never a floating capsule.
 */
export default function PortalShell({ nav, user, home, roleLabel, children }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href) => (href === home ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));

  const sidebar = (
    <div className="flex h-full flex-col bg-navy-900">
      <div className="flex justify-end px-3 pt-3 lg:hidden">
        <button type="button" className="p-1 text-white/50 hover:text-white" onClick={() => setOpen(false)} aria-label="Close">
          <X className="size-4" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto pb-4 pt-3">
        {nav.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex items-center gap-2.5 border-s-2 px-4 py-[7px] text-[13px] transition-colors",
                active
                  ? "border-gold-400 bg-white/[0.08] font-semibold text-white"
                  : "border-transparent font-medium text-white/60 hover:bg-white/[0.04] hover:text-white",
              )}
            >
              <Icon name={item.icon} className={cn("size-4 shrink-0", active ? "text-gold-400" : "text-white/40 group-hover:text-white/70")} />
              <span className="flex-1 truncate">{item.label}</span>
              {item.badge > 0 && (
                <span className="rounded-[2px] bg-gold-600 px-1 text-[10px] font-bold leading-4 text-white tabular">{item.badge}</span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-[2px] border border-white/15 bg-navy-800 text-[11px] font-bold text-gold-400">
            {initials(user.name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12.5px] font-semibold text-white">{user.name}</p>
            <p className="truncate text-[11px] text-white/40">{user.email}</p>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-[2px] p-1.5 text-white/45 hover:bg-white/10 hover:text-white"
              title={t("nav.logout")}
              aria-label={t("nav.logout")}
            >
              <LogOut className="size-4 rtl:rotate-180" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-canvas">
      {/* ------------------------------------------------------------ masthead */}
      <header className="no-print fixed inset-x-0 top-0 z-50">
        <div className="flex h-12 items-center gap-3 bg-navy-950 px-3 sm:px-4">
          <button
            type="button"
            className="rounded-[2px] p-1.5 text-white/70 hover:bg-white/10 hover:text-white lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Menu"
          >
            <Menu className="size-5" />
          </button>

          <Logo href={home} dark />

          <span className="hidden h-5 w-px bg-white/15 sm:block" />
          <span className="hidden text-[10.5px] font-semibold uppercase tracking-[0.16em] text-white/45 sm:block">{roleLabel}</span>

          <div className="ms-auto flex items-center gap-1">
            <Link
              href="/"
              className="hidden h-8 items-center gap-1.5 rounded-[2px] px-2.5 text-[12px] font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white sm:inline-flex"
            >
              <ExternalLink className="size-3.5" /> {t("nav.website")}
            </Link>
            <LanguageSwitcher variant="dark" />
          </div>
        </div>
        <div className="flex h-[3px]">
          <div className="flag-stripe w-60 shrink-0" />
          <div className="flex-1 bg-gold-600" />
        </div>
      </header>

      {/* --------------------------------------------------------- navigation */}
      <aside className="fixed bottom-0 start-0 top-[51px] z-40 hidden w-60 lg:block">{sidebar}</aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-navy-950/60" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 start-0 w-64">{sidebar}</aside>
        </div>
      )}

      {/* ------------------------------------------------------------ content */}
      <div className="pt-[51px] lg:ps-60">
        <main className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-6">{children}</main>
      </div>
    </div>
  );
}
