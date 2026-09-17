"use client";

import Link from "next/link";
import ActionForm, { SubmitButton } from "@/components/ui/ActionForm";
import PasswordInput from "@/components/auth/PasswordInput";
import { useI18n } from "@/components/I18nProvider";
import { loginAction } from "@/app/actions/auth";

export default function LoginForm({ next }) {
  const { t } = useI18n();
  return (
    <ActionForm action={loginAction} className="space-y-4">
      <input type="hidden" name="next" value={next || ""} />
      <label className="block">
        <span className="label">{t("form.email")}</span>
        <input name="email" type="email" required autoComplete="email" className="input h-11" dir="ltr" />
      </label>
      <label className="block">
        <span className="label">{t("form.password")}</span>
        <PasswordInput name="password" autoComplete="current-password" />
      </label>
      <SubmitButton className="btn-lg w-full">{t("auth.login")}</SubmitButton>
      <p className="pt-2 text-center text-sm text-muted">
        {t("auth.noAccount")} <Link href={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="link">{t("auth.createAccount")}</Link>
      </p>
    </ActionForm>
  );
}
