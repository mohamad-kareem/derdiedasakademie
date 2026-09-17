import Link from "next/link";
import { Plus, BookOpen, CalendarDays, Users, ArrowRight } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/ui/Blocks";
import { LevelBadge, StatusBadge } from "@/components/ui/Badges";
import FormModal from "@/components/admin/FormModal";
import { CourseFields } from "@/components/admin/Fields";
import { requireAdmin } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import connectDB from "@/lib/mongodb";
import Course from "@/models/Course";
import Enrollment from "@/models/Enrollment";
import { saveCourse } from "@/app/actions/admin";
import { LEVELS } from "@/lib/constants";
import { cn, formatDate, formatMoney, plain } from "@/lib/utils";

export default async function AdminCoursesPage({ searchParams }) {
  const sp = await searchParams;
  await requireAdmin();
  const { t, locale } = await getI18n();
  await connectDB();

  const status = ["draft", "published", "archived"].includes(sp.status) ? sp.status : null;
  const level = LEVELS.includes(sp.level) ? sp.level : null;
  const query = {};
  if (status) query.status = status;
  if (level) query.level = level;

  const [courses, counts] = await Promise.all([
    Course.find(query).sort({ startDate: -1 }).lean(),
    Enrollment.aggregate([{ $match: { status: { $in: ["active", "pending", "completed"] } } }, { $group: { _id: { course: "$course", status: "$status" }, n: { $sum: 1 } } }]),
  ]);
  const stat = {};
  counts.forEach(({ _id, n }) => {
    const k = String(_id.course);
    stat[k] = stat[k] || { active: 0, pending: 0, completed: 0 };
    stat[k][_id.status] = n;
  });

  const qs = (patch) => {
    const p = new URLSearchParams();
    const next = { status, level, ...patch };
    Object.entries(next).forEach(([k, v]) => v && p.set(k, v));
    const s = p.toString();
    return s ? `/admin/courses?${s}` : "/admin/courses";
  };

  return (
    <>
      <PageHeader
        title={t("admin.nav.courses")}
        description={t("admin.courses.subtitle")}
        actions={
          <FormModal defaultOpen={sp.new === "1"} trigger={<><Plus className="size-4" /> {t("admin.courses.new")}</>} title={t("admin.courses.new")} action={saveCourse.bind(null, null)} submitLabel={t("admin.courses.create")} size="lg">
            <CourseFields t={t} />
          </FormModal>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-line bg-white p-1">
          {[null, "published", "draft", "archived"].map((s) => (
            <Link key={s || "all"} href={qs({ status: s })} className={cn("rounded-md px-3 py-1.5 text-xs font-medium", status === s ? "bg-navy-900 text-white" : "text-muted hover:bg-canvas")}>
              {s ? t(`status.${s}`) : t("common.all")}
            </Link>
          ))}
        </div>
        <div className="flex rounded-lg border border-line bg-white p-1">
          {[null, ...LEVELS].map((l) => (
            <Link key={l || "all"} href={qs({ level: l })} className={cn("rounded-md px-2.5 py-1.5 text-xs font-medium", level === l ? "bg-navy-900 text-white" : "text-muted hover:bg-canvas")}>
              {l || t("common.all")}
            </Link>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        {courses.length ? (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("admin.fields.title")}</th>
                  <th>{t("courses.dates")}</th>
                  <th>{t("admin.courses.students")}</th>
                  <th>{t("courses.price")}</th>
                  <th>{t("admin.fields.status")}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {plain(courses).map((c) => {
                  const s = stat[c._id] || { active: 0, pending: 0 };
                  return (
                    <tr key={c._id} className="hover:bg-canvas/40">
                      <td>
                        <Link href={`/admin/courses/${c._id}`} className="flex items-center gap-2.5">
                          <LevelBadge level={c.level} />
                          <span>
                            <span className="block font-medium text-ink hover:underline">{c.title}</span>
                            <span className="block text-xs text-muted">{t(`format.${c.format}`)}{c.schedule ? ` · ${c.schedule}` : ""}</span>
                          </span>
                        </Link>
                      </td>
                      <td className="whitespace-nowrap text-muted"><CalendarDays className="me-1.5 inline size-3.5" />{formatDate(c.startDate, locale)} – {formatDate(c.endDate, locale)}</td>
                      <td className="whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5"><Users className="size-3.5 text-muted" /> {s.active}/{c.capacity}</span>
                        {s.pending > 0 && <span className="badge ms-2 bg-amber-50 text-amber-800">+{s.pending} {t("status.pending")}</span>}
                      </td>
                      <td className="whitespace-nowrap">{formatMoney(c.price, c.currency, locale)}</td>
                      <td><StatusBadge status={c.status} label={t(`status.${c.status}`)} /></td>
                      <td className="text-end"><Link href={`/admin/courses/${c._id}`} className="btn btn-outline btn-sm">{t("admin.courses.manage")} <ArrowRight className="size-3.5 rtl:rotate-180" /></Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={<BookOpen className="size-5" />} title={t("admin.courses.empty")} text={t("admin.courses.emptyText")} />
        )}
      </div>
    </>
  );
}
