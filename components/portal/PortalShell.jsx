"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ExternalLink, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import Logo from "@/components/Logo";
import Icon from "@/components/ui/Icon";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import UserMenu from "@/components/portal/UserMenu";
import { useI18n } from "@/components/I18nProvider";
import { cn } from "@/lib/utils";

/**
 * The administrative shell.
 *
 * The column is a register of sections and nothing else: no account block, no
 * badges, no tinted fields. Groups are separated the way a printed index
 * separates them — a small-caps heading with a rule running out to the margin —
 * and the section you are in is marked by a solid navy bar on the leading edge.
 * Counts are set as plain tabular figures, not pills.
 *
 * Identity lives in the masthead beside the academy's name. The column can be
 * reduced to an icon rail; the choice is kept in a cookie and read back on the
 * server, so a reload opens in the same state with no flicker.
 */

const WIDE = "210px";
const RAIL = "52px";

export default function PortalShell({ nav, user, home, roleLabel, profileHref, defaultCollapsed = false, children }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const [open, setOpen] = useState(false); // the drawer, on small screens
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const isActive = (href) => (href === home ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `ddd_nav=${next ? "mini" : "full"}; path=/; max-age=31536000; samesite=lax`;
  }

  /** The column. `mini` is only ever true for the fixed desktop column. */
  const column = (mini) => (
    <div className="flex h-full flex-col border-e border-line bg-paper">
      <div className="flex justify-end px-2 pt-2 lg:hidden">
        <button type="button" className="p-1.5 text-muted hover:text-navy-900" onClick={() => setOpen(false)} aria-label="Close">
          <X className="size-4" />
        </button>
      </div>

      <nav className={cn("flex-1 overflow-y-auto overflow-x-hidden", mini ? "px-1.5 py-2.5" : "py-2.5")}>
        {nav.map((item, i) => {
          const active = isActive(item.href);
          const newSection = item.section && item.section !== nav[i - 1]?.section;
          return (
            <div key={item.href}>
              {newSection &&
                (mini ? (
                  <span className="mx-2 my-2 block border-t border-line" />
                ) : (
                  /* A heading and a rule to the margin — the way an index is set. */
                  <span className="mt-4 mb-1 flex items-center gap-2 pe-3 ps-4">
                    <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted/70">{item.section}</span>
                    <span className="h-px flex-1 bg-line" />
                  </span>
                ))}
              <Link
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                title={mini ? item.label : undefined}
                className={cn(
                  "group relative flex items-center transition-colors",
                  mini
                    ? "h-9 justify-center rounded-[2px]"
                    : "h-[30px] gap-2.5 ps-4 pe-3 text-[12.5px] before:absolute before:inset-y-[3px] before:start-0 before:w-[3px] before:content-['']",
                  active
                    ? mini
                      ? "bg-navy-50 text-navy-900"
                      : "font-semibold text-navy-900 before:bg-navy-800"
                    : mini
                      ? "text-muted hover:bg-cream hover:text-navy-900"
                      : "font-medium text-ink/70 before:bg-transparent hover:text-navy-900",
                )}
              >
                <Icon
                  name={item.icon}
                  className={cn(
                    "shrink-0 transition-colors",
                    mini ? "size-[17px]" : "size-[15px]",
                    active ? "text-navy-800" : "text-muted group-hover:text-navy-700",
                  )}
                />
                {!mini && <span className="flex-1 truncate">{item.label}</span>}
                {item.badge > 0 &&
                  (mini ? (
                    <span className="absolute end-1.5 top-1.5 size-[5px] rounded-full bg-navy-700" aria-hidden />
                  ) : (
                    <span className="shrink-0 text-[11px] font-semibold text-navy-700 tabular">{item.badge}</span>
                  ))}
              </Link>
            </div>
          );
        })}
      </nav>

      {/* One quiet control, on its own rule at the foot of the column. */}
      <button
        type="button"
        onClick={toggle}
        className={cn(
          "hidden h-9 items-center border-t border-line text-muted transition-colors hover:bg-cream hover:text-navy-900 lg:flex",
          mini ? "justify-center" : "justify-end pe-3",
        )}
        title={mini ? t("nav.expand") : t("nav.collapse")}
        aria-label={mini ? t("nav.expand") : t("nav.collapse")}
        aria-expanded={!mini}
      >
        {mini ? <PanelLeftOpen className="size-4 rtl:-scale-x-100" /> : <PanelLeftClose className="size-4 rtl:-scale-x-100" />}
      </button>
    </div>
  );

  const width = collapsed ? RAIL : WIDE;

  return (
    <div className="min-h-screen bg-canvas">
      {/* ------------------------------------------------------------ masthead */}
      <header className="no-print fixed inset-x-0 top-0 z-50">
        <div className="flex h-12 items-center gap-2 bg-paper px-3 sm:gap-3 sm:px-4">
          <button
            type="button"
            className="rounded-[2px] p-1.5 text-muted hover:bg-cream hover:text-navy-900 lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Menu"
          >
            <Menu className="size-5" />
          </button>

          <Logo href={home} />

          <span className="hidden h-5 w-px bg-line sm:block" />
          <span className="hidden text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted sm:block">{roleLabel}</span>

          <div className="ms-auto flex items-center gap-1">
            <Link
              href="/"
              className="hidden h-8 items-center gap-1.5 rounded-[2px] px-2.5 text-[12px] font-semibold text-muted transition-colors hover:bg-cream hover:text-navy-900 sm:inline-flex"
            >
              <ExternalLink className="size-3.5" /> {t("nav.website")}
            </Link>
            <LanguageSwitcher />
            <span className="mx-1 hidden h-5 w-px bg-line sm:block" />
            <UserMenu user={user} profileHref={profileHref} />
          </div>
        </div>
        {/* The national stripe runs the width of the column, then brass to the margin. */}
        <div className="flex h-[3px]">
          <div className="flag-stripe w-28 shrink-0 sm:w-[210px]" />
          <div className="flex-1 bg-gold-600" />
        </div>
      </header>

      {/* --------------------------------------------------------- navigation */}
      <aside className="fixed bottom-0 start-0 top-[51px] z-40 hidden lg:block" style={{ width }}>
        {column(collapsed)}
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-navy-950/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 start-0 w-60">{column(false)}</aside>
        </div>
      )}

      {/* ------------------------------------------------------------ content */}
      <div className="pt-[51px]" style={{ "--nav-w": width }}>
        <div className="lg:ps-[var(--nav-w)]">
          <main className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
