"use client";

import { useI18n } from "@/components/I18nProvider";
import { useState } from "react";
import { ShieldBan } from "lucide-react";
import Modal from "@/components/ui/Modal";
import ActionForm, { SubmitButton } from "@/components/ui/ActionForm";
import { setStudentBlock } from "@/app/actions/blocking";

export default function StudentBlockForm({ student }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" className="btn btn-ghost btn-sm text-muted" onClick={() => setOpen(true)} title={t("blocking.title")}><ShieldBan className="size-3.5" />{t(student.isBlocked ? "blocking.title" : "blocking.block")}</button>
    <Modal open={open} onClose={() => setOpen(false)} title={t("blocking.title")} description={student.name} size="sm">
    <p className="text-sm text-muted">{t("blocking.hint")}</p>
    <ActionForm action={setStudentBlock.bind(null, student._id)} onSuccess={() => setOpen(false)} className="mt-4 space-y-3">
      <input type="hidden" name="mode" value="block" />
      <label className="block"><span className="label">{t("blocking.reason")}</span><textarea name="blockReason" defaultValue={student.blockReason || ""} required maxLength={1000} rows={3} className="input" /></label>
      <SubmitButton>{t(student.isBlocked ? "blocking.updateReason" : "blocking.block")}</SubmitButton>
    </ActionForm>
    {student.isBlocked && <ActionForm action={setStudentBlock.bind(null, student._id)} onSuccess={() => setOpen(false)} className="mt-3"><input type="hidden" name="mode" value="unblock" /><SubmitButton>{t("blocking.unblock")}</SubmitButton></ActionForm>}
    </Modal>
  </>;
}
