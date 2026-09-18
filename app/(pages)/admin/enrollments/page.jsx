import Link from "next/link";
import { Layers } from "lucide-react";
import { PageHeader, EmptyState, Breadcrumb } from "@/components/ui/Blocks";
import { LevelBadge, StatusBadge } from "@/components/ui/Badges";
import EnrollmentActions from "@/components/admin/EnrollmentActions";
import { requireAdmin } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import connectDB from "@/lib/mongodb";
import Enrollment from "@/models/Enrollment";
import "@/models/User";
import "@/models/Course";
import { cn, formatDate, formatMoney, plain } from "@/lib/utils";

const STATUSES = ["pending", "active", "completed", "rejected", "cancelled", "unpaid", "all"];

export default async function EnrollmentsPage({ searchParams }) {
  const { status: raw } = await searchParams;
  const status = STATUSES.includes(raw) ? raw : "pending";
  await requireAdmin();
  const { t, locale } = await getI18n();
  await connectDB();

  const query = status === "all" ? {} : status === "unpaid" ? { paymentStatus: "unpaid", status: { $in: ["active", "completed", "pending"] } } : { status };
  const list = plain(await Enrollment.find(query).populate("student", "name email phone level").populate("course", "title level currency").sort({ createdAt: -1 }).limit(300).lean()).filter((e) => e.student && e.course);

  return (
    <>
      <PageHeader title={t("admin.nav.enrollments")} description={t("admin.enroll.subtitle")} >
        <Breadcrumb trail={[t("admin.portal"), t("admin.nav.enrollments")]} />
      </PageHeader>
      <div className="mb-4 flex flex-wrap gap-1 rounded-[3px] border border-line bg-white p-1 sm:inline-flex">
        {STATUSES.map((s) => (
          <Link key={s} href={`/admin/enrollments?status=${s}`} className={cn("rounded-[3px] px-3 py-1.5 text-xs font-medium", status === s ? "bg-navy-900 text-white" : "text-muted hover:bg-canvas")}>
            {s === "all" ? t("common.all") : s === "unpaid" ? t("payment.unpaid") : t(`status.${s}`)}
          </Link>
        ))}
      </div>
      <div className="card overflow-hidden">
        {list.length ? (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>{t("admin.students.student")}</th><th>{t("admin.enroll.course")}</th><th>{t("admin.enroll.requested")}</th><th>{t("admin.fields.status")}</th><th>{t("admin.enroll.payment")}</th><th /></tr></thead>
              <tbody>
                {list.map((e) => (
                  <tr key={e._id} className="hover:bg-canvas/40">
                    <td>
                      <Link href={`/admin/students/${e.student._id}`} className="font-medium text-ink hover:underline">{e.student.name}</Link>
                      <p className="text-xs text-muted">{e.student.email}{e.student.phone ? ` · ${e.student.phone}` : ""}</p>
                      {e.message && <p className="mt-1 max-w-xs text-xs italic text-ink/70">“{e.message}”</p>}
                    </td>
                    <td>
                      <Link href={`/admin/courses/${e.course._id}?tab=students`} className="flex items-center gap-2 hover:underline"><LevelBadge level={e.course.level} /> <span className="text-sm">{e.course.title}</span></Link>
                      <p className="mt-0.5 text-xs text-muted">{t("admin.enroll.studentLevel")}: {e.student.level === "unknown" ? t("form.levelUnknown") : e.student.level}</p>
                    </td>
                    <td className="whitespace-nowrap text-muted">{formatDate(e.createdAt, locale)}</td>
                    <td><StatusBadge status={e.status} label={t(`status.${e.status}`)} /></td>
                    <td className="whitespace-nowrap">
                      <StatusBadge status={e.paymentStatus} label={t(`payment.${e.paymentStatus}`)} />
                      <p className="mt-0.5 text-xs text-muted">{formatMoney(e.amount, e.course.currency, locale)}</p>
                    </td>
                    <td><EnrollmentActions e={e} t={t} compact /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState icon={<Layers className="size-5" />} title={t("admin.enroll.empty")} />}
      </div>
    </>
  );
}
