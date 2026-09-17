"use client";

import ActionForm, { SubmitButton } from "@/components/ui/ActionForm";
import { useI18n } from "@/components/I18nProvider";
import { requestEnrollment } from "@/app/actions/student";

export default function EnrollBox({ courseId, disabled }) {
  const { t } = useI18n();
  if (disabled) return <button className="btn btn-outline w-full" disabled>{t("courses.full")}</button>;
  return (
    <ActionForm action={requestEnrollment.bind(null, courseId)} className="space-y-3">
      <label className="block">
        <span className="label">{t("enroll.messageLabel")}</span>
        <textarea name="message" rows={3} className="input text-sm" placeholder={t("enroll.messagePlaceholder")} />
      </label>
      <SubmitButton className="w-full">{t("enroll.request")}</SubmitButton>
      <p className="text-center text-xs text-muted">{t("enroll.note")}</p>
    </ActionForm>
  );
}
