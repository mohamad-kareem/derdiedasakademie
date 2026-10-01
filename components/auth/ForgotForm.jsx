"use client";

import { useState } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import ActionForm, { SubmitButton } from "@/components/ui/ActionForm";
import { useI18n } from "@/components/I18nProvider";
import { requestPasswordReset } from "@/app/actions/auth";

/**
 * Asking for a way back in.
 *
 * The confirmation says a letter is on its way without saying whether the
 * address was one we knew, because the difference between those two answers
 * is exactly what somebody fishing for our students' addresses would want.
 */
export default function ForgotForm() {
  const { t } = useI18n();
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <div className="space-y-4">
        <p className="flex items-start gap-2.5 rounded-[3px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <MailCheck className="mt-0.5 size-4 shrink-0" />
          {t("auth.reset.sentLong")}
        </p>
        <Link href="/login" className="btn btn-outline w-full">{t("auth.login")}</Link>
      </div>
    );
  }

  return (
    <ActionForm action={requestPasswordReset} showSuccess={false} onSuccess={() => setSent(true)} className="space-y-4">
      <label className="block">
        <span className="label">{t("form.email")}</span>
        <input name="email" type="email" required autoComplete="email" className="input h-11" dir="ltr" />
      </label>
      <SubmitButton className="btn-lg w-full">{t("auth.reset.send")}</SubmitButton>
      <p className="pt-2 text-center text-sm text-muted">
        <Link href="/login" className="link">{t("auth.reset.backToLogin")}</Link>
      </p>
    </ActionForm>
  );
}
