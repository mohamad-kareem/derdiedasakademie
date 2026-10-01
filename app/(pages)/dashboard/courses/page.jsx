import Link from "next/link";
import StudentPayment from "@/components/site/StudentPayment";
import { getBankAccount } from "@/lib/bank";
import { getWhishAccount } from "@/lib/whish";
import { hasCourseAccess } from "@/lib/enrollment-access";
import { paymentBalance, schoolToday } from "@/lib/installments";
import PaymentReminders from "@/components/portal/PaymentReminders";
import { BookOpen, CalendarDays, Clock, ArrowRight, Award } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/ui/Blocks";
import { LevelBadge, StatusBadge } from "@/components/ui/Badges";
import ActionButton from "@/components/ui/ActionButton";
import { requireStudent } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { scheduleText } from "@/lib/schedule";
import { getMyEnrollments } from "@/lib/student-data";
import { cancelEnrollment } from "@/app/actions/student";
import { formatDate, formatMoney } from "@/lib/utils";

export default async function MyCoursesPage() {
  const user = await requireStudent();
  const { t, locale } = await getI18n();
  const enrollments = await getMyEnrollments(user.id);
  const whishAccount = await getWhishAccount();
  const bankAccount = await getBankAccount();

  return (
    <>
      <PageHeader title={t("student.nav.courses")} description={t("student.courses.subtitle")} actions={<Link href="/courses" className="btn btn-primary">{t("student.nav.browse")}</Link>} />
      <PaymentReminders enrollments={enrollments} today={schoolToday()} />
      {enrollments.length === 0 ? (
        <div className="card">
          <EmptyState icon={<BookOpen className="size-5" />} title={t("student.overview.noCoursesTitle")} text={t("student.overview.noCoursesText")} action={<Link href="/courses" className="btn btn-primary">{t("student.nav.browse")}</Link>} />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {enrollments.map((e) => {
            const c = e.course;
            const approved = ["active", "completed"].includes(e.status);
            const open = hasCourseAccess(e);
            return (
              <div key={e._id} className="card flex flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <LevelBadge level={c.level} />
                    <span className="text-xs text-muted">{t(`levels.${c.level}.name`)}</span>
                  </div>
                  <div className="flex gap-1.5">
                    <StatusBadge status={e.status} label={t(`status.${e.status}`)} />
                    {e.status !== "rejected" && e.status !== "cancelled" && <StatusBadge status={e.paymentStatus} label={t(`payment.${e.paymentStatus}`)} />}
                  </div>
                </div>
                <h3 className="mt-3 text-lg font-semibold text-navy-900">{c.title}</h3>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
                  <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-4" /> {formatDate(c.startDate, locale)} – {formatDate(c.endDate, locale)}</span>
                  {scheduleText(c, t, locale) && <span className="inline-flex items-center gap-1.5"><Clock className="size-4" /> {scheduleText(c, t, locale)}</span>}
                </div>
                <p className="mt-3 text-sm text-ink/75">{t(`enroll.state.${e.status}`)}</p>
                {approved && !open && <p className="mt-2 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{t("whish.accessLocked")}</p>}
                {e.amount > 0 && !["rejected", "cancelled"].includes(e.status) && (
                  <StudentPayment enrollmentId={e._id} method={e.paymentMethod} approved={approved} unpaid={e.paymentStatus !== "paid"} amount={paymentBalance(e).remaining} currency={c.currency} whishAccount={whishAccount} bankAccount={bankAccount} />
                )}
                {e.status !== "rejected" && e.status !== "cancelled" && e.paymentStatus !== "paid" && e.amount > 0 && (
                  <div className="mt-2 text-xs text-muted">
                    <p>{t("student.courses.amountDue", { amount: formatMoney(paymentBalance(e).remaining, c.currency, locale) })}</p>
                    {e.paymentStatus === "partial" && <><p>{t("installments.received")}: {formatMoney(paymentBalance(e).received, c.currency, locale)}</p><p>{t("installments.dueDate")}: {e.paymentDueDate}</p></>}
                  </div>
                )}
                <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4">
                  {open && <Link href={`/dashboard/courses/${c._id}`} className="btn btn-primary btn-sm">{t("student.courses.enter")} <ArrowRight className="size-3.5 rtl:rotate-180" /></Link>}
                  {e.status === "completed" && open && <Link href={`/certificate/${e._id}`} className="btn btn-gold btn-sm"><Award className="size-3.5" /> {t("certificate.view")}</Link>}
                  {e.status === "pending" && <ActionButton action={cancelEnrollment.bind(null, e._id)} confirm>{t("student.courses.cancelRequest")}</ActionButton>}
                  {(e.status === "rejected" || e.status === "cancelled") && <Link href={`/courses/${c._id}`} className="btn btn-outline btn-sm">{t("student.courses.requestAgain")}</Link>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
