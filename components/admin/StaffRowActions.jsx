"use client";

import { Pencil, Trash2, UserCheck, UserMinus } from "lucide-react";
import ActionButton from "@/components/ui/ActionButton";
import FormModal from "@/components/admin/FormModal";
import { StaffFields } from "@/components/admin/Fields";
import { useI18n } from "@/components/I18nProvider";
import { saveStaff, setStaffActive, deleteStaff } from "@/app/actions/admin";

/** Edit, suspend or remove a colleague. Never shown on the owner's own row. */
export default function StaffRowActions({ person }) {
  const { t } = useI18n();
  const suspended = person.isActive === false;

  return (
    <div className="flex items-center justify-end gap-1.5">
      <FormModal
        trigger={<><Pencil className="size-3.5" /> {t("common.edit")}</>}
        triggerClassName="btn-outline btn-sm"
        title={person.name}
        action={saveStaff.bind(null, person._id)}
      >
        <StaffFields t={t} person={person} />
      </FormModal>

      <ActionButton
        action={setStaffActive.bind(null, person._id, suspended)}
        confirm
        title={t(suspended ? "admin.staff.restore" : "admin.staff.suspend")}
        className="btn-ghost"
      >
        {suspended ? <UserCheck className="size-3.5" /> : <UserMinus className="size-3.5" />}
      </ActionButton>

      <ActionButton action={deleteStaff.bind(null, person._id)} confirm title={t("common.delete")} className="btn-ghost text-red-700">
        <Trash2 className="size-3.5" />
      </ActionButton>
    </div>
  );
}
