"use client";

import ActionForm, { SubmitButton } from "@/components/ui/ActionForm";
import { useI18n } from "@/components/I18nProvider";
import { saveCourse } from "@/app/actions/admin";

export default function InlineCourseForm({ courseId, children }) {
  const { t } = useI18n();
  return (
    <ActionForm action={saveCourse.bind(null, courseId)}>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
      <div className="mt-5 flex justify-end border-t border-line pt-4">
        <SubmitButton>{t("common.saveChanges")}</SubmitButton>
      </div>
    </ActionForm>
  );
}
