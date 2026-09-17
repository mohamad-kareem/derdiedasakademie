"use client";

import { useI18n } from "@/components/I18nProvider";

export default function Error({ reset }) {
  const { t } = useI18n();
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <h1 className="text-xl font-semibold text-navy-900">{t("errors.pageTitle")}</h1>
      <p className="mt-2 max-w-sm text-sm text-muted">{t("errors.pageText")}</p>
      <button type="button" onClick={() => reset()} className="btn btn-primary mt-6">{t("common.tryAgain")}</button>
    </div>
  );
}
