"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, Check, ChevronDown } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import { LOCALE_COOKIE } from "@/lib/constants";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { code: "en", label: "English", short: "EN" },
  { code: "de", label: "Deutsch", short: "DE" },
  { code: "ar", label: "العربية", short: "AR" },
];

function applyLocale(code) {
  document.cookie = `${LOCALE_COOKIE}=${code}; path=/; max-age=31536000; samesite=lax`;
  document.documentElement.lang = code;
  document.documentElement.dir = code === "ar" ? "rtl" : "ltr";
}

export default function LanguageSwitcher({ variant = "light", className }) {
  const { locale } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  function choose(code) {
    setOpen(false);
    if (code === locale) return;
    applyLocale(code);
    router.refresh();
  }

  const current = OPTIONS.find((o) => o.code === locale) || OPTIONS[0];

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-[2px] px-2 text-[12px] font-semibold transition-colors",
          variant === "dark" ? "text-white/80 hover:bg-white/10 hover:text-white" : "text-ink/80 hover:bg-navy-50",
        )}
      >
        <Globe className="size-4" />
        {current.short}
        <ChevronDown className="size-3 opacity-60" />
      </button>
      {open && (
        <ul role="listbox" className="absolute end-0 z-50 mt-1 w-40 overflow-hidden rounded-[3px] border border-line-strong bg-white py-1 shadow-sm">
          {OPTIONS.map((o) => (
            <li key={o.code}>
              <button
                type="button"
                onClick={() => choose(o.code)}
                className="flex w-full items-center justify-between px-3 py-1.5 text-[13px] text-ink hover:bg-cream"
              >
                <span>{o.label}</span>
                {o.code === locale && <Check className="size-3.5 text-gold-600" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
