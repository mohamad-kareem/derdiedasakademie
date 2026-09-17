"use client";

import { createContext, useContext, useMemo } from "react";
import { makeT } from "@/lib/i18n/translate";

const I18nContext = createContext(null);

export function I18nProvider({ locale, dict, children }) {
  const value = useMemo(() => ({ locale, dir: locale === "ar" ? "rtl" : "ltr", t: makeT(dict) }), [locale, dict]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
