import { cache } from "react";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALES, LOCALE_COOKIE } from "@/lib/constants";
import { makeT } from "./translate";
import enBase from "./en";
import deBase from "./de";
import arBase from "./ar";
import enLearning from "./en-learning";
import deLearning from "./de-learning";
import arLearning from "./ar-learning";

function merge(base, extra) {
  const out = { ...base };
  for (const [k, v] of Object.entries(extra)) {
    out[k] = v && typeof v === "object" && !Array.isArray(v) && base[k] && typeof base[k] === "object" ? merge(base[k], v) : v;
  }
  return out;
}

const en = merge(enBase, enLearning);
const de = merge(deBase, deLearning);
const ar = merge(arBase, arLearning);

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
