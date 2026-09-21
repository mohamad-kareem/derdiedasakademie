import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import PrintButton from "@/components/portal/PrintButton";
import { requireUser } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { isId } from "@/lib/validate";
import { isStaff } from "@/lib/roles";
import connectDB from "@/lib/mongodb";
import Enrollment from "@/models/Enrollment";
import "@/models/Course";
import "@/models/User";
import { site } from "@/lib/site";
import { formatDate } from "@/lib/utils";

export default async function CertificatePage({ params }) {
  const { id } = await params;
  if (!isId(id)) notFound();
  const user = await requireUser();
  const { t, locale } = await getI18n();
  await connectDB();
  const e = await Enrollment.findOne({ _id: id, status: "completed" }).populate("course").populate("student", "name").lean();
  if (!e?.course || !e.student) notFound();
  if (user.role !== "admin" && String(e.student._id) !== user.id) notFound();

  const back = isStaff(user) ? `/admin/courses/${e.course._id}?tab=students` : "/dashboard/courses";
  const certNo = `DDD-${e.course.level}-${String(e._id).slice(-8).toUpperCase()}`;

  return (
    <div className="min-h-screen bg-canvas px-4 py-8 print:bg-white print:p-0">
      <div className="no-print mx-auto mb-5 flex max-w-4xl items-center justify-between">
        <Link href={back} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-navy-900"><ArrowLeft className="size-4 rtl:rotate-180" /> {t("common.back")}</Link>
        <PrintButton label={t("certificate.print")} />
      </div>
      <div className="mx-auto aspect-[1.414/1] max-w-4xl bg-white p-3 shadow-sm print:shadow-none" dir="ltr">
        <div className="relative flex h-full flex-col items-center justify-between border-[6px] border-double border-navy-900 px-10 py-10 text-center">
          <div className="flag-stripe absolute inset-x-0 top-0 h-1.5" />
          <div className="flex flex-col items-center">
            <Image src="/logo/mark.png" alt="" width={480} height={200} className="h-12 w-auto" />
            <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-gold-600">{site.name}</p>
          </div>
          <div>
            <p className="font-display text-4xl font-semibold text-navy-900 sm:text-5xl" style={{ fontFamily: "var(--font-display)" }}>Certificate of Completion</p>
            <p className="mt-1 text-sm italic text-muted">Teilnahmebescheinigung</p>
            <p className="mt-8 text-sm text-muted">This is to certify that</p>
            <p className="mt-2 border-b border-line px-10 pb-2 font-display text-3xl text-navy-900" style={{ fontFamily: "var(--font-display)" }}>{e.student.name}</p>
            <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-ink/80">
              has successfully completed the online German language course <strong>{e.course.title}</strong> at level{" "}
              <strong>{e.course.level}</strong> of the Common European Framework of Reference for Languages (CEFR).
            </p>
          </div>
          <div className="grid w-full grid-cols-3 items-end gap-6 text-xs text-muted">
            <div><p className="font-semibold text-ink">{formatDate(e.course.startDate, "en")} – {formatDate(e.course.endDate, "en")}</p><p className="mt-1 border-t border-line pt-1">Course period</p></div>
            <div className="flex justify-center"><span className="flex size-20 items-center justify-center rounded-full border-2 border-gold-500 font-display text-2xl font-semibold text-gold-600">{e.course.level}</span></div>
            <div><p className="font-semibold text-ink">{formatDate(e.completedAt || e.updatedAt, "en")}</p><p className="mt-1 border-t border-line pt-1">Date of issue · {certNo}</p></div>
          </div>
        </div>
      </div>
      {locale !== "en" && <p className="no-print mx-auto mt-3 max-w-4xl text-center text-xs text-muted">{t("certificate.note")}</p>}
    </div>
  );
}
