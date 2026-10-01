"use client";

import { useState } from "react";
import { useI18n } from "@/components/I18nProvider";
import ActionForm, { SubmitButton } from "@/components/ui/ActionForm";
import WhishTransfer from "@/components/site/WhishTransfer";
import BankTransfer from "@/components/site/BankTransfer";
import { setStudentPaymentMethod } from "@/app/actions/payments";

export default function StudentPayment({ enrollmentId, method, approved, unpaid, amount, currency, whishAccount, bankAccount }) {
  const { t } = useI18n();
  const [choice, setChoice] = useState(method === "bank" ? "bank" : "whish");
  return (
    <div className="mt-3 rounded border border-line bg-canvas p-3 text-sm">
      {unpaid ? <ActionForm action={setStudentPaymentMethod.bind(null, enrollmentId)} className="flex flex-wrap items-end gap-2">
        <label className="block min-w-40 flex-1"><span className="label">{t("whish.method")}</span>
          <select name="paymentMethod" value={choice} onChange={(e) => setChoice(e.target.value)} className="input">
            <option value="whish">Whish Money</option><option value="bank">{t("bank.title")}</option>
          </select>
        </label>
        <SubmitButton>{t("bank.saveMethod")}</SubmitButton>
      </ActionForm> : <p className="font-medium">{t("whish.method")}: {method === "bank" ? t("bank.title") : "Whish Money"}</p>}
      {unpaid && approved && (choice === "bank" ? <BankTransfer account={bankAccount} amount={amount} currency={currency} /> : <WhishTransfer account={whishAccount} />)}
      {unpaid && !approved && <p className="mt-2 text-xs text-muted">{t("whish.approvalFirst")}</p>}
    </div>
  );
}
