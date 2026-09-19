"use client";

import ActionForm, { SubmitButton } from "@/components/ui/ActionForm";
import AvatarField from "@/components/portal/AvatarField";
import PasswordInput from "@/components/auth/PasswordInput";
import { useI18n } from "@/components/I18nProvider";
import { updateProfile, changePassword } from "@/app/actions/student";
import { LEVELS } from "@/lib/constants";

export default function ProfileForms({ user, showLevel }) {
  const { t } = useI18n();
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="card p-5">
        <h2 className="text-sm font-semibold text-navy-900">{t("profile.details")}</h2>
        <div className="mt-4">
          <AvatarField user={user} />
        </div>
        <ActionForm action={updateProfile} className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="label">{t("form.fullName")}</span>
            <input name="name" defaultValue={user.name} required className="input" />
          </label>
          <label className="block sm:col-span-2">
            <span className="label">{t("form.email")}</span>
            <input value={user.email} disabled className="input" dir="ltr" readOnly />
          </label>
          <label className="block">
            <span className="label">{t("form.phone")}</span>
            <input name="phone" defaultValue={user.phone} className="input" dir="ltr" />
          </label>
          <label className="block">
            <span className="label">{t("form.country")}</span>
            <input name="country" defaultValue={user.country} className="input" />
          </label>
          {showLevel && (
            <label className="block sm:col-span-2">
              <span className="label">{t("form.currentLevel")}</span>
              <select name="level" defaultValue={user.level} className="input">
                <option value="unknown">{t("form.levelUnknown")}</option>
                {LEVELS.map((l) => <option key={l} value={l}>{l} · {t(`levels.${l}.name`)}</option>)}
              </select>
            </label>
          )}
          <div className="flex justify-end sm:col-span-2"><SubmitButton>{t("common.save")}</SubmitButton></div>
        </ActionForm>
      </section>
      <section className="card p-5">
        <h2 className="text-sm font-semibold text-navy-900">{t("profile.password")}</h2>
        <ActionForm action={changePassword} resetOnSuccess className="mt-4 space-y-4">
          <label className="block">
            <span className="label">{t("profile.currentPassword")}</span>
            <PasswordInput name="current" autoComplete="current-password" />
          </label>
          <label className="block">
            <span className="label">{t("profile.newPassword")}</span>
            <PasswordInput name="password" autoComplete="new-password" minLength={8} />
          </label>
          <label className="block">
            <span className="label">{t("form.confirmPassword")}</span>
            <PasswordInput name="confirm" autoComplete="new-password" minLength={8} />
          </label>
          <div className="flex justify-end"><SubmitButton>{t("profile.updatePassword")}</SubmitButton></div>
        </ActionForm>
      </section>
    </div>
  );
}
