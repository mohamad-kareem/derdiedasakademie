"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import ActionForm, { SubmitButton } from "@/components/ui/ActionForm";
import { useI18n } from "@/components/I18nProvider";
import { cn } from "@/lib/utils";

/** Trigger button + modal containing a server-action form. Fields are passed as children. */
export default function FormModal({ defaultOpen = false, trigger, triggerClassName, title, description, action, children, submitLabel, size = "md" }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(defaultOpen);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={cn("btn", triggerClassName || "btn-primary")}>
        {trigger}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={title} description={description} size={size}>
        <ActionForm action={action} onSuccess={() => setOpen(false)}>
          <div className="grid gap-4 sm:grid-cols-2">{children}</div>
          <div className="mt-6 flex justify-end gap-2 border-t border-line pt-4">
            <button type="button" onClick={() => setOpen(false)} className="btn btn-outline">{t("common.cancel")}</button>
            <SubmitButton>{submitLabel || t("common.save")}</SubmitButton>
          </div>
        </ActionForm>
      </Modal>
    </>
  );
}
