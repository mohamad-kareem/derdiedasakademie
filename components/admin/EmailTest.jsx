"use client";

import ActionForm, { SubmitButton } from "@/components/ui/ActionForm";
import { useI18n } from "@/components/I18nProvider";
import { sendTestEmail } from "@/app/actions/admin";

/** Proof that the settings work, which is the only thing worth showing here. */
export default function EmailTest({ defaultTo }) {
  const { t } = useI18n();
  return (
    <ActionForm action={sendTestEmail} className="flex flex-wrap items-end gap-2">
      <label className="min-w-[220px] flex-1">
        <span className="label">{t("admin.settings.testTo")}</span>
        <input name="to" type="email" required defaultValue={defaultTo} className="input" dir="ltr" />
      </label>
      <SubmitButton>{t("admin.settings.testSend")}</SubmitButton>
    </ActionForm>
  );
}
