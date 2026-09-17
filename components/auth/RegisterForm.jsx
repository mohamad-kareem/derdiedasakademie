"use client";

import Link from "next/link";
import ActionForm, { SubmitButton } from "@/components/ui/ActionForm";
import PasswordInput from "@/components/auth/PasswordInput";
import { useI18n } from "@/components/I18nProvider";
import { registerAction } from "@/app/actions/auth";
import { LEVELS } from "@/lib/constants";

export default function RegisterForm({ next }) {
  const { t } = useI18n();
  return (
    <ActionForm action={registerAction} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="next" value={next || ""} />
      <label className="block sm:col-span-2">
        <span className="label">{t("form.fullName")}</span>
        <input name="name" required autoComplete="name" className="input h-11" />
      </label>
      <label className="block sm:col-span-2">
        <span className="label">{t("form.email")}</span>
        <input name="email" type="email" required autoComplete="email" className="input h-11" dir="ltr" />
      </label>
      <label className="block">
        <span className="label">{t("form.phone")} <span className="font-normal text-muted">({t("form.optional")})</span></span>
        <input name="phone" autoComplete="tel" className="input h-11" dir="ltr" />
      </label>
      <label className="block">
        <span className="label">{t("form.currentLevel")}</span>
        <select name="level" className="input h-11" defaultValue="unknown">
          <option value="unknown">{t("form.levelUnknown")}</option>
          {LEVELS.map((l) => <option key={l} value={l}>{l} · {t(`levels.${l}.name`)}</option>)}
        </select>
      </label>
      <label className="block">
        <span className="label">{t("form.password")}</span>
        <PasswordInput name="password" autoComplete="new-password" minLength={8} />
      </label>
      <label className="block">
        <span className="label">{t("form.confirmPassword")}</span>
        <PasswordInput name="confirm" autoComplete="new-password" minLength={8} />
      </label>
      <p className="text-xs text-muted sm:col-span-2">{t("auth.passwordHint")}</p>
      <SubmitButton className="btn-lg w-full sm:col-span-2">{t("auth.createAccount")}</SubmitButton>
      <p className="text-center text-sm text-muted sm:col-span-2">
        {t("auth.haveAccount")} <Link href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="link">{t("auth.login")}</Link>
      </p>
    </ActionForm>
  );
}
