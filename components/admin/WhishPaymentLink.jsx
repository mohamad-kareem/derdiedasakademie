"use client";

import ActionForm, { SubmitButton } from "@/components/ui/ActionForm";
import { useI18n } from "@/components/I18nProvider";
import { setWhishPaymentLink } from "@/app/actions/admin";

export default function WhishPaymentLink({ enrollmentId, url = "" }) {
  const { t } = useI18n();
  return (
    <details className="mt-2 whitespace-normal text-xs">
      <summary className="cursor-pointer text-navy-900">{t("whish.manageLink")}</summary>
      <ActionForm action={setWhishPaymentLink.bind(null, enrollmentId)} className="mt-2 min-w-60 space-y-2">
        <label className="block">
          <span className="label">{t("whish.linkLabel")}</span>
          <input type="url" name="whishPaymentUrl" defaultValue={url} placeholder="https://whish.money/…" className="input" dir="ltr" maxLength={2000} />
        </label>
        <p className="text-muted">{t("whish.linkHint")}</p>
        <SubmitButton>{t("whish.saveLink")}</SubmitButton>
      </ActionForm>
    </details>
  );
}
