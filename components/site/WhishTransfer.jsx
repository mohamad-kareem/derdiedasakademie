"use client";

import { useState } from "react";
import { useI18n } from "@/components/I18nProvider";

export default function WhishTransfer({ account, reference }) {
  const { t } = useI18n();
  const [choice, setChoice] = useState(account.number ? "number" : "qr");
  if (!account.number && !account.qrKey) return <p className="mt-2 text-xs text-muted">{t("whish.notConfigured")}</p>;
  return (
    <div className="mt-3 space-y-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label={t("whish.chooseTransfer")}>
        {account.number && <button type="button" aria-pressed={choice === "number"} className={`btn btn-sm ${choice === "number" ? "btn-primary" : "btn-outline"}`} onClick={() => setChoice("number")}>{t("whish.useNumber")}</button>}
        {account.qrKey && <button type="button" aria-pressed={choice === "qr"} className={`btn btn-sm ${choice === "qr" ? "btn-primary" : "btn-outline"}`} onClick={() => setChoice("qr")}>{t("whish.useQr")}</button>}
      </div>
      {choice === "number" && account.number && <div><p className="text-xs text-muted">{t("whish.sendTo")}</p><p className="mt-1 select-all text-lg font-semibold" dir="ltr">{account.number}</p></div>}
      {choice === "qr" && account.qrKey && <a href={`/api/files?key=${encodeURIComponent(account.qrKey)}&inline=1`} target="_blank" rel="noopener noreferrer" className="block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/api/files?key=${encodeURIComponent(account.qrKey)}&inline=1`} alt={t("whish.qr")} className="max-h-64 max-w-full rounded border border-line bg-white object-contain" />
        <span className="text-xs underline">{t("whish.openQr")}</span>
      </a>}
      <p className="text-xs text-muted">{t("whish.transferNote")}</p>
      {reference && <p className="break-all text-xs text-muted">{t("whish.reference")}: <span dir="ltr" className="select-all">{reference}</span></p>}
    </div>
  );
}
