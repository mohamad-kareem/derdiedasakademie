import { cache } from "react";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALES, LOCALE_COOKIE } from "@/lib/constants";
import { makeT } from "./translate";
import en from "./en";
import de from "./de";
import ar from "./ar";

export const dictionaries = { en, de, ar };

export const getI18n = cache(async () => {
  const store = await cookies();
  const raw = store.get(LOCALE_COOKIE)?.value;
  const locale = LOCALES.includes(raw) ? raw : DEFAULT_LOCALE;
  const dict = dictionaries[locale];
  return {
    locale,
    dir: locale === "ar" ? "rtl" : "ltr",
    dict,
    t: makeT(dict, en),
  };
});
