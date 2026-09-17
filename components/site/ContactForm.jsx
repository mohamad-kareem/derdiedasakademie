"use client";

import ActionForm, { SubmitButton } from "@/components/ui/ActionForm";
import { useI18n } from "@/components/I18nProvider";
import { submitInquiry } from "@/app/actions/public";
import { LEVELS } from "@/lib/constants";

export default function ContactForm() {
  const { t } = useI18n();
  return (
    <ActionForm action={submitInquiry} resetOnSuccess className="grid gap-4 sm:grid-cols-2">
      <input type="text" name="company" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <label className="block">
        <span className="label">{t("form.name")} *</span>
        <input name="name" required className="input" autoComplete="name" />
      </label>
      <label className="block">
        <span className="label">{t("form.email")} *</span>
        <input name="email" type="email" required className="input" autoComplete="email" dir="ltr" />
      </label>
      <label className="block">
        <span className="label">{t("form.phone")}</span>
        <input name="phone" className="input" autoComplete="tel" dir="ltr" />
      </label>
      <label className="block">
        <span className="label">{t("form.currentLevel")}</span>
        <select name="level" className="input" defaultValue="unknown">
          <option value="unknown">{t("form.levelUnknown")}</option>
          {LEVELS.map((l) => <option key={l} value={l}>{l} · {t(`levels.${l}.name`)}</option>)}
        </select>
      </label>
      <label className="block sm:col-span-2">
        <span className="label">{t("form.message")}</span>
        <textarea name="message" rows={4} className="input" placeholder={t("contact.messagePlaceholder")} />
      </label>
      <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted">{t("contact.privacy")}</p>
        <SubmitButton className="btn-lg">{t("contact.send")}</SubmitButton>
      </div>
    </ActionForm>
  );
}
