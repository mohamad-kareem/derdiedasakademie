"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useI18n } from "@/components/I18nProvider";
import { installmentReminder, paymentBalance } from "@/lib/installments";
import { formatMoney } from "@/lib/utils";

export default function PaymentReminders({ enrollments, owner = false, today }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [date, setDate] = useState(today);
  useEffect(() => {
    const tick = () => setDate(new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()));
    tick(); const timer = setInterval(() => { tick(); router.refresh(); }, 60000); return () => clearInterval(timer);
  }, [router]);
  const due = enrollments.filter((e) => e.course && installmentReminder(e, date));
  if (!due.length) return null;
  return <div className="my-4 space-y-2" aria-live="polite">
    {due.map((e) => {
      const reminder = installmentReminder(e, date);
      return <div key={e._id} className={`rounded border p-3 text-sm ${reminder.overdue ? "border-red-200 bg-red-50 text-red-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
        <p className="font-semibold">{t(reminder.overdue ? "installments.overdue" : "installments.reminder")}</p>
        <p>{owner && e.student?.name ? `${e.student.name} · ` : ""}{e.course.title} · {formatMoney(paymentBalance(e).remaining, e.course.currency, locale)} · {t("installments.dueDate")}: {e.paymentDueDate}</p>
        <Link href={owner ? "/admin/enrollments?status=unpaid" : "/dashboard/courses"} className="mt-1 inline-block underline">{t(owner ? "installments.review" : "installments.pay")}</Link>
      </div>;
    })}
  </div>;
}
