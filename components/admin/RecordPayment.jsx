"use client";

import { useState } from "react";
import { CircleDollarSign } from "lucide-react";
import Modal from "@/components/ui/Modal";
import ActionForm, { SubmitButton } from "@/components/ui/ActionForm";
import { useI18n } from "@/components/I18nProvider";
import { recordEnrollmentPayment } from "@/app/actions/admin";
import { paymentBalance } from "@/lib/installments";
import { formatMoney } from "@/lib/utils";

export default function RecordPayment({ enrollment, compact }) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("full");
  const balance = paymentBalance(enrollment);
  const [received, setReceived] = useState(String(balance.received || ""));
  const currency = enrollment.course?.currency || "EUR";
  return <>
    <button type="button" className="btn btn-outline btn-sm" title={t("admin.enroll.markPaid")} onClick={() => { setMode(enrollment.paymentStatus === "partial" ? "partial" : "full"); setReceived(String(paymentBalance(enrollment).received || "")); setOpen(true); }}>
      <CircleDollarSign className="size-3.5" /> {!compact && t("installments.record")}
    </button>
    <Modal open={open} onClose={() => setOpen(false)} title={t("installments.record")} description={enrollment.course?.title}>
      <ActionForm action={recordEnrollmentPayment.bind(null, enrollment._id)} onSuccess={() => setOpen(false)} className="space-y-4">
        <p className="text-sm">{t("installments.total")}: <strong>{formatMoney(balance.total, currency, locale)}</strong></p>
        <label className="block"><span className="label">{t("installments.type")}</span><select name="paymentMode" value={mode} onChange={(e) => setMode(e.target.value)} className="input"><option value="full">{t("installments.full")}</option><option value="partial">{t("installments.partial")}</option></select></label>
        {mode === "partial" && <>
          <label className="block"><span className="label">{t("installments.received")}</span><input name="paidAmount" type="number" min="0.01" max={Math.max(0, balance.total - 0.01)} step="0.01" value={received} onChange={(e) => setReceived(e.target.value)} required className="input" /><span className="text-xs text-muted">{t("installments.cumulativeHint")}</span></label>
          <p className="text-sm">{t("installments.remaining")}: <strong>{formatMoney(Math.max(0, balance.total - (Number(received) || 0)), currency, locale)}</strong></p>
          <label className="block"><span className="label">{t("installments.dueDate")}</span><input type="date" name="paymentDueDate" defaultValue={enrollment.paymentDueDate || ""} required className="input" /></label>
        </>}
        <p className="text-xs text-muted">{t("installments.confirmHint")}</p>
        <SubmitButton>{t("common.save")}</SubmitButton>
      </ActionForm>
    </Modal>
  </>;
}
