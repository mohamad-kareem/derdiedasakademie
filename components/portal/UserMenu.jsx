"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, LogOut, UserRound } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import { logoutAction } from "@/app/actions/auth";
import Avatar from "@/components/ui/Avatar";

/**
 * Who is signed in, stated in the masthead rather than at the foot of the
 * navigation column — identity belongs with the institution's name, not with
 * the list of sections. The column is then free to be nothing but navigation.
 */
export default function UserMenu({ user, profileHref }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const esc = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-8 items-center gap-2 rounded-[2px] ps-1 pe-1.5 transition-colors hover:bg-shell-hover"
      >
        <Avatar name={user.name} avatarKey={user.avatarKey} size={26} />
        <span className="hidden max-w-[132px] truncate text-[12.5px] font-semibold text-navy-900 md:block">{user.name}</span>
        <ChevronDown className="size-3 text-muted" />
      </button>

      {open && (
        <div role="menu" className="absolute end-0 z-50 mt-1 w-56 rounded-[3px] border border-line-strong bg-white shadow-sm">
          <div className="flex items-center gap-2.5 border-b border-line px-3 py-2.5">
            <Avatar name={user.name} avatarKey={user.avatarKey} size={34} />
            <div className="min-w-0">
              <p className="truncate text-[12.5px] font-semibold text-navy-900">{user.name}</p>
              <p className="truncate text-[11px] text-muted">{user.email}</p>
            </div>
          </div>
          {profileHref && (
            <Link
              href={profileHref}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-ink hover:bg-cream"
            >
              <UserRound className="size-4 text-muted" /> {t("student.nav.profile")}
            </Link>
          )}
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] text-ink hover:bg-cream"
            >
              <LogOut className="size-4 text-muted rtl:rotate-180" /> {t("nav.logout")}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
