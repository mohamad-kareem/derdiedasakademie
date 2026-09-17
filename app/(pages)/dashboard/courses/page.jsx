import Link from "next/link";
import { BookOpen, CalendarDays, Clock, ArrowRight, Award } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/ui/Blocks";
import { LevelBadge, StatusBadge } from "@/components/ui/Badges";
import ActionButton from "@/components/ui/ActionButton";
import { requireStudent } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { getMyEnrollments } from "@/lib/student-data";
import { cancelEnrollment } from "@/app/actions/student";
import { formatDate, formatMoney } from "@/lib/utils";

export default async function MyCoursesPage() {
  const user = await requireStudent();
  const { t, locale } = await getI18n();
  const enrollments = await getMyEnrollments(user.id);

  return (
    <>
      <PageHeader title={t("student.nav.courses")} description={t("student.courses.subtitle")} actions={<Link href="/courses" className="btn btn-primary">{t("student.nav.browse")}</Link>} />
      {enrollments.length === 0 ? (
        <div className="card">
          <EmptyState icon={<BookOpen className="size-5" />} title={t("student.overview.noCoursesTitle")} text={t("student.overview.noCoursesText")} action={<Link href="/courses" className="btn btn-primary">{t("student.nav.browse")}</Link>} />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {enrollments.map((e) => {
            const c = e.course;
            const open = ["active", "completed"].includes(e.status);
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
                  {c.schedule && <span className="inline-flex items-center gap-1.5"><Clock className="size-4" /> {c.schedule}</span>}
                </div>
                <p className="mt-3 text-sm text-ink/75">{t(`enroll.state.${e.status}`)}</p>
                {e.status !== "rejected" && e.status !== "cancelled" && e.paymentStatus === "unpaid" && e.amount > 0 && (
                  <p className="mt-2 text-xs text-muted">{t("student.courses.amountDue", { amount: formatMoney(e.amount, c.currency, locale) })}</p>
                )}
                <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4">
                  {open && <Link href={`/dashboard/courses/${c._id}`} className="btn btn-primary btn-sm">{t("student.courses.enter")} <ArrowRight className="size-3.5 rtl:rotate-180" /></Link>}
                  {e.status === "completed" && <Link href={`/certificate/${e._id}`} className="btn btn-gold btn-sm"><Award className="size-3.5" /> {t("certificate.view")}</Link>}
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
