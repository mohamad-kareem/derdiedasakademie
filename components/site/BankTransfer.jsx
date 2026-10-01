"use client";

import { useI18n } from "@/components/I18nProvider";
import { formatMoney } from "@/lib/utils";

export default function BankTransfer({ account, amount, currency }) {
  const { t, locale } = useI18n();
  if (!account) return <p className="mt-3 text-xs text-muted">{t("bank.notConfigured")}</p>;
  if (account.bankCurrency !== currency?.toUpperCase()) return <p className="mt-3 text-sm text-amber-900">{t("bank.currencyMismatch", { currency })}</p>;
  const fields = [["bankAccountHolder", "holder"], ["bankName", "name"], ["bankIban", "iban"], ["bankAccountNumber", "accountNumber"], ["bankSwift", "swift"]];
  return (
    <div className="mt-3 space-y-3">
      <dl className="space-y-2 rounded border border-line bg-white p-3">
        {fields.map(([key, label]) => account[key] && <div key={key}><dt className="text-xs text-muted">{t(`bank.${label}`)}</dt><dd className="select-all break-all font-medium" dir={key === "bankAccountHolder" || key === "bankName" ? undefined : "ltr"}>{account[key]}</dd></div>)}
        <div><dt className="text-xs text-muted">{t("bank.amount")}</dt><dd className="font-medium">{formatMoney(amount, currency, locale)}</dd></div>
      </dl>
      <p className="text-xs text-muted">{t("bank.transferNote")}</p>
      <p className="text-xs text-muted">{t("whish.transferExample")}: <span dir="ltr" className="inline-block select-all font-medium text-ink">Elie Karim - A1</span></p>
    </div>
  );
}
