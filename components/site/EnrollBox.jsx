"use client";

import ActionForm, { SubmitButton } from "@/components/ui/ActionForm";
import { useI18n } from "@/components/I18nProvider";
import { requestEnrollment } from "@/app/actions/student";

export default function EnrollBox({ courseId, disabled }) {
  const { t } = useI18n();
  if (disabled) return <button className="btn btn-outline w-full" disabled>{t("courses.full")}</button>;
  return (
    <ActionForm action={requestEnrollment.bind(null, courseId)} className="space-y-3">
      <fieldset>
        <legend className="label">{t("whish.method")}</legend>
        <label className="flex items-center gap-3 rounded border border-line bg-canvas p-3 text-sm">
          <input type="radio" name="paymentMethod" value="whish" defaultChecked required />
          <span><span className="block font-semibold">Whish Money</span><span className="text-xs text-muted">{t("whish.description")}</span></span>
        </label>
      </fieldset>
      <label className="block">
        <span className="label">{t("enroll.messageLabel")}</span>
        <textarea name="message" rows={3} className="input text-sm" placeholder={t("enroll.messagePlaceholder")} />
      </label>
      <SubmitButton className="w-full">{t("enroll.request")}</SubmitButton>
      <p className="text-center text-xs text-muted">{t("whish.enrollmentNote")}</p>
    </ActionForm>
  );
}
