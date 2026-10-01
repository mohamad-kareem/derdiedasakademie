"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import Modal from "@/components/ui/Modal";
import StudentEditForm from "@/components/admin/StudentEditForm";
import StudentBlockForm from "@/components/admin/StudentBlockForm";
import { useI18n } from "@/components/I18nProvider";

export default function StudentProfileActions({ student }) {
  const { t } = useI18n();
  const [edit, setEdit] = useState(false);
  return <div className="flex shrink-0 items-center gap-2">
    <button type="button" className="btn btn-outline btn-sm" onClick={() => setEdit(true)}><Pencil className="size-3.5" />{t("admin.students.edit")}</button>
    <StudentBlockForm student={student} />
    <Modal open={edit} onClose={() => setEdit(false)} title={t("admin.students.edit")} description={student.name} size="sm"><StudentEditForm student={student} onSuccess={() => setEdit(false)} /></Modal>
  </div>;
}
