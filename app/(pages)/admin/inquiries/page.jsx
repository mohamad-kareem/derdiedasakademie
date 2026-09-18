import Link from "next/link";
import { Inbox, Mail, Phone, Trash2 } from "lucide-react";
import { PageHeader, EmptyState, Breadcrumb } from "@/components/ui/Blocks";
import { LevelBadge, StatusBadge } from "@/components/ui/Badges";
import ActionButton from "@/components/ui/ActionButton";
import { requireAdmin } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import connectDB from "@/lib/mongodb";
import Inquiry from "@/models/Inquiry";
import { setInquiryStatus, deleteInquiry } from "@/app/actions/admin";
import { cn, formatDateTime, plain } from "@/lib/utils";

const FILTERS = ["new", "contacted", "closed", "all"];

export default async function InquiriesPage({ searchParams }) {
  const { status: raw } = await searchParams;
  const status = FILTERS.includes(raw) ? raw : "new";
  await requireAdmin();
  const { t, locale } = await getI18n();
  await connectDB();
  const items = plain(await Inquiry.find(status === "all" ? {} : { status }).sort({ createdAt: -1 }).limit(300).lean());

  return (
    <>
      <PageHeader title={t("admin.nav.inquiries")} description={t("admin.inquiries.subtitle")} >
        <Breadcrumb trail={[t("admin.portal"), t("admin.nav.inquiries")]} />
      </PageHeader>
      <div className="mb-4 flex flex-wrap gap-1 rounded-[3px] border border-line bg-white p-1 sm:inline-flex">
        {FILTERS.map((s) => (
          <Link key={s} href={`/admin/inquiries?status=${s}`} className={cn("rounded-[3px] px-3 py-1.5 text-xs font-medium", status === s ? "bg-navy-900 text-white" : "text-muted hover:bg-canvas")}>
            {s === "all" ? t("common.all") : t(`status.${s}`)}
          </Link>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {items.length ? items.map((q) => (
          <div key={q._id} className="card flex flex-col p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-ink">{q.name}</p>
                <p className="text-xs text-muted">{formatDateTime(q.createdAt, locale)}</p>
              </div>
              <div className="flex items-center gap-1.5">
                {q.level !== "unknown" && <LevelBadge level={q.level} />}
                <StatusBadge status={q.status} label={t(`status.${q.status}`)} />
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <a href={`mailto:${q.email}`} className="link inline-flex items-center gap-1.5 text-xs"><Mail className="size-3.5" /> {q.email}</a>
              {q.phone && <a href={`tel:${q.phone}`} className="link inline-flex items-center gap-1.5 text-xs" dir="ltr"><Phone className="size-3.5" /> {q.phone}</a>}
            </div>
            <p className="prose-text mt-3 flex-1 rounded-[3px] bg-canvas/60 p-3 text-[13px]">{q.message || "—"}</p>
            <div className="mt-3 flex flex-wrap justify-end gap-1.5 border-t border-line pt-3">
              {q.status !== "contacted" && <ActionButton action={setInquiryStatus.bind(null, q._id, "contacted")}>{t("admin.inquiries.markContacted")}</ActionButton>}
              {q.status !== "closed" && <ActionButton action={setInquiryStatus.bind(null, q._id, "closed")}>{t("admin.inquiries.close")}</ActionButton>}
              <ActionButton action={deleteInquiry.bind(null, q._id)} confirm className="btn-ghost"><Trash2 className="size-3.5" /></ActionButton>
            </div>
          </div>
        )) : <div className="card lg:col-span-2"><EmptyState icon={<Inbox className="size-5" />} title={t("admin.inquiries.empty")} /></div>}
      </div>
    </>
  );
}
