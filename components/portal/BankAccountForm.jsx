"use client";

import ActionForm, { SubmitButton } from "@/components/ui/ActionForm";
import { useI18n } from "@/components/I18nProvider";
import { saveBankAccount } from "@/app/actions/payments";

const fields = [["bankAccountHolder", "holder", 120], ["bankName", "name", 120], ["bankIban", "iban", 34], ["bankAccountNumber", "accountNumber", 60], ["bankSwift", "swift", 11], ["bankCurrency", "currency", 3]];

export default function BankAccountForm({ user }) {
  const { t } = useI18n();
  return (
    <section className="card mt-6 p-5">
      <h2 className="text-sm font-semibold text-navy-900">{t("bank.profileTitle")}</h2>
      <p className="mt-2 text-sm text-muted">{t("bank.profileHint")}</p>
      <ActionForm action={saveBankAccount} className="mt-4 grid max-w-3xl gap-4 sm:grid-cols-2">
        {fields.map(([key, label, maxLength]) => <label key={key} className="block">
          <span className="label">{t(`bank.${label}`)}</span>
          <input name={key} defaultValue={user[key] || ""} maxLength={maxLength} className="input" dir={key === "bankAccountHolder" || key === "bankName" ? undefined : "ltr"} placeholder={key === "bankCurrency" ? "EUR" : undefined} />
        </label>)}
        <p className="text-xs text-muted sm:col-span-2">{t("bank.clearHint")}</p>
        <div className="sm:col-span-2"><SubmitButton>{t("common.save")}</SubmitButton></div>
      </ActionForm>
    </section>
  );
}
