"use client";

import ActionForm, { SubmitButton } from "@/components/ui/ActionForm";
import PasswordInput from "@/components/auth/PasswordInput";
import { useI18n } from "@/components/I18nProvider";
import { setPasswordWithToken } from "@/app/actions/auth";

export default function ResetForm({ token }) {
  const { t } = useI18n();
  return (
    <ActionForm action={setPasswordWithToken.bind(null, token)} className="space-y-4">
      <label className="block">
        <span className="label">{t("auth.reset.newPassword")}</span>
        <PasswordInput name="password" autoComplete="new-password" />
        <span className="hint block">{t("auth.reset.rule")}</span>
      </label>
      <label className="block">
        <span className="label">{t("auth.reset.confirm")}</span>
        <PasswordInput name="confirm" autoComplete="new-password" />
      </label>
      <SubmitButton className="btn-lg w-full">{t("auth.reset.save")}</SubmitButton>
    </ActionForm>
  );
}
