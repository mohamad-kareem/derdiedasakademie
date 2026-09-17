"use client";

import ActionForm, { SubmitButton } from "@/components/ui/ActionForm";
import { useI18n } from "@/components/I18nProvider";
import { updateStudent } from "@/app/actions/admin";
import { LEVELS } from "@/lib/constants";

export default function StudentEditForm({ student }) {
  const { t } = useI18n();
  return (
    <ActionForm action={updateStudent.bind(null, student._id)} className="space-y-3">
      <label className="block"><span className="label">{t("form.fullName")}</span><input name="name" defaultValue={student.name} className="input" required /></label>
      <label className="block"><span className="label">{t("form.phone")}</span><input name="phone" defaultValue={student.phone} className="input" dir="ltr" /></label>
      <label className="block">
        <span className="label">{t("admin.fields.level")}</span>
        <select name="level" defaultValue={student.level} className="input">
          <option value="unknown">{t("form.levelUnknown")}</option>
          {LEVELS.map((l) => <option key={l} value={l}>{l} · {t(`levels.${l}.name`)}</option>)}
        </select>
      </label>
      <label className="block"><span className="label">{t("admin.students.note")}</span><textarea name="adminNote" rows={3} defaultValue={student.adminNote} className="input" placeholder={t("admin.students.notePlaceholder")} /></label>
      <label className="block"><span className="label">{t("admin.students.resetPassword")}</span><input name="newPassword" type="text" autoComplete="off" className="input" dir="ltr" placeholder={t("admin.students.resetPasswordHint")} /></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isActive" defaultChecked={student.isActive} className="size-4 accent-navy-900" /> {t("admin.students.accountEnabled")}</label>
      <SubmitButton className="w-full">{t("common.saveChanges")}</SubmitButton>
    </ActionForm>
  );
}
