"use client";

import { useState } from "react";
import ActionForm, { SubmitButton } from "@/components/ui/ActionForm";
import FileUploader from "@/components/files/FileUploader";
import { useI18n } from "@/components/I18nProvider";
import { saveWhishAccount } from "@/app/actions/whish";

export default function WhishAccountForm({ user }) {
  const { t } = useI18n();
  const [qr, setQr] = useState(user.whishQrKey || "");
  return (
    <section className="card mt-6 p-5">
      <h2 className="text-sm font-semibold text-navy-900">{t("whish.accountTitle")}</h2>
      <p className="mt-2 text-sm text-muted">{t("whish.accountHint")}</p>
      <ActionForm action={saveWhishAccount} className="mt-4 max-w-lg space-y-4">
        <label className="block"><span className="label">{t("whish.number")}</span><input type="tel" name="whishNumber" defaultValue={user.whishNumber || ""} maxLength={30} className="input" dir="ltr" /></label>
        <div><span className="label">{t("whish.qr")}</span>
          <p className="mb-2 text-xs text-muted">{t("whish.qrHint")}</p>
          <FileUploader name="whishQr" scope="whish-qr" max={1} compact accept="image/png,image/jpeg,image/webp" initial={user.whishQrKey ? [{ key: user.whishQrKey, name: "Whish QR", type: "image/png" }] : []} onChange={(files) => setQr(files[0]?.key || "")} />
          {qr && <a href={`/api/files?key=${encodeURIComponent(qr)}&inline=1`} target="_blank" rel="noopener noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/files?key=${encodeURIComponent(qr)}&inline=1`} alt={t("whish.qr")} className="mt-3 max-h-64 max-w-full rounded border border-line object-contain" />
          </a>}
        </div>
        <SubmitButton>{t("common.save")}</SubmitButton>
      </ActionForm>
    </section>
  );
}
