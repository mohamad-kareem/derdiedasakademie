import Link from "next/link";
import { Plus, BookOpen, ArrowRight } from "lucide-react";
import { PageHeader, EmptyState, Breadcrumb } from "@/components/ui/Blocks";
import { LevelBadge, StatusBadge } from "@/components/ui/Badges";
import FormModal from "@/components/admin/FormModal";
import { CourseFields } from "@/components/admin/Fields";
import { requireStaff } from "@/lib/auth";
import { can, isOwner, teaches, portalKey } from "@/lib/roles";
import { getI18n } from "@/lib/i18n/server";
import connectDB from "@/lib/mongodb";
import Course from "@/models/Course";
import Enrollment from "@/models/Enrollment";
import User from "@/models/User";
import { saveCourse } from "@/app/actions/admin";
import { LEVELS } from "@/lib/constants";
import { cn, formatDate, formatMoney, plain } from "@/lib/utils";

export default async function AdminCoursesPage({ searchParams }) {
  const sp = await searchParams;
  const user = await requireStaff();
  const { t, locale } = await getI18n();
  await connectDB();
  const owner = isOwner(user);
  const money = can(user, "finance.view");
  const onlyMine = sp.mine === "1";

  const status = ["draft", "published", "archived"].includes(sp.status) ? sp.status : null;
  const level = LEVELS.includes(sp.level) ? sp.level : null;
  const query = {};
  if (status) query.status = status;
  if (level) query.level = level;
  if (onlyMine) query.teacher = user.id;

  const [courses, counts, staff] = await Promise.all([
    Course.find(query).sort({ startDate: -1 }).lean(),
    Enrollment.aggregate([{ $match: { status: { $in: ["active", "pending", "completed"] } } }, { $group: { _id: { course: "$course", status: "$status" }, n: { $sum: 1 } } }]),
    User.find({ role: { $in: ["owner", "teacher", "admin"] } }).select("name").sort({ name: 1 }).lean(),
  ]);
  const teacherNames = Object.fromEntries(plain(staff).map((p) => [p._id, p.name]));
  const stat = {};
  counts.forEach(({ _id, n }) => {
    const k = String(_id.course);
    stat[k] = stat[k] || { active: 0, pending: 0, completed: 0 };
    stat[k][_id.status] = n;
  });

  const qs = (patch) => {
    const p = new URLSearchParams();
    const next = { status, level, mine: onlyMine ? "1" : null, ...patch };
    Object.entries(next).forEach(([k, v]) => v && p.set(k, v));
    const s = p.toString();
    return s ? `/admin/courses?${s}` : "/admin/courses";
  };

  return (
    <>
      <PageHeader
        title={t("admin.nav.courses")}
        description={t(owner ? "admin.courses.subtitle" : "admin.courses.teacherSubtitle")}
        actions={
          can(user, "courses.create") && <FormModal
            defaultOpen={sp.new === "1"}
            trigger={<><Plus className="size-3.5" /> {t("admin.courses.new")}</>}
            title={t("admin.courses.new")}
            action={saveCourse.bind(null, null)}
            submitLabel={t("admin.courses.create")}
            size="lg"
          >
            <CourseFields t={t} staff={plain(staff)} />
          </FormModal>
        }
      >
        <Breadcrumb trail={[t(portalKey(user)), t("admin.nav.courses")]} />
      </PageHeader>

      {/* ------------------------------------------------------------ filters */}
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-muted">{t("admin.fields.status")}</span>
          <div className="toolbar">
            {[null, "published", "draft", "archived"].map((s) => (
              <Link key={s || "all"} href={qs({ status: s })} className={cn("toolbar-item", status === s && "toolbar-item-active")}>
                {s ? t(`status.${s}`) : t("common.all")}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-muted">{t("admin.fields.level")}</span>
          <div className="toolbar">
            {[null, ...LEVELS].map((l) => (
              <Link key={l || "all"} href={qs({ level: l })} className={cn("toolbar-item tabular", level === l && "toolbar-item-active")}>
                {l || t("common.all")}
              </Link>
            ))}
          </div>
        </div>

        <div className="toolbar">
          <Link href={qs({ mine: null })} className={cn("toolbar-item", !onlyMine && "toolbar-item-active")}>{t("common.all")}</Link>
          <Link href={qs({ mine: "1" })} className={cn("toolbar-item", onlyMine && "toolbar-item-active")}>{t("admin.courses.mine")}</Link>
        </div>

        <p className="ms-auto text-[11.5px] text-muted tabular">
          {t(courses.length === 1 ? "common.result" : "common.results", { n: courses.length })}
        </p>
      </div>

      {/* -------------------------------------------------------------- table */}
      <div className="card overflow-hidden">
        {courses.length ? (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-14">{t("admin.fields.level")}</th>
                  <th>{t("admin.fields.title")}</th>
                  <th className="w-56">{t("courses.dates")}</th>
                  <th className="w-40">{t("admin.courses.students")}</th>
                  <th className="w-36">{t("admin.fields.teacher")}</th>
                  {money && <th className="w-24">{t("courses.price")}</th>}
                  <th className="w-28">{t("admin.fields.status")}</th>
                  <th className="w-24" />
                </tr>
              </thead>
              <tbody>
                {plain(courses).map((c) => {
                  const s = stat[c._id] || { active: 0, pending: 0 };
                  const full = Math.min(100, Math.round((s.active / c.capacity) * 100));
                  return (
                    <tr key={c._id}>
                      <td>
                        <LevelBadge level={c.level} />
                      </td>
                      <td>
                        <Link href={`/admin/courses/${c._id}`} className="block font-medium text-ink hover:text-navy-700 hover:underline">
                          {c.title}
                        </Link>
                        <span className="mt-0.5 block text-[11.5px] text-muted">
                          {t(`format.${c.format}`)}
                          {c.schedule ? ` · ${c.schedule}` : ""}
                        </span>
                      </td>
                      <td className="whitespace-nowrap text-muted tabular">
                        {formatDate(c.startDate, locale)} – {formatDate(c.endDate, locale)}
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="w-12 shrink-0 tabular">
                            {s.active}/{c.capacity}
                          </span>
                          <span className="h-1 w-14 shrink-0 bg-canvas">
                            <span className="block h-full bg-navy-700" style={{ width: `${full}%` }} />
                          </span>
                          {s.pending > 0 && (
                            <span className="badge border border-amber-700/25 bg-amber-50 text-amber-900">+{s.pending}</span>
                          )}
                        </div>
                      </td>
                      <td className="truncate text-[12.5px] text-muted">
                        {c.teacher ? teacherNames[String(c.teacher)] || t("admin.fields.teacherNone") : t("admin.fields.teacherNone")}
                      </td>
                      {money && <td className="whitespace-nowrap tabular">{formatMoney(c.price, c.currency, locale)}</td>}
                      <td>
                        <StatusBadge status={c.status} label={t(`status.${c.status}`)} />
                      </td>
                      <td className="text-end">
                        <Link href={`/admin/courses/${c._id}`} className="btn btn-outline btn-sm">
                          {teaches(user, c) ? t("admin.courses.manage") : t("admin.courses.open")} <ArrowRight className="size-3 rtl:rotate-180" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={<BookOpen className="size-4" />} title={t("admin.courses.empty")} text={t("admin.courses.emptyText")} />
        )}
      </div>
    </>
  );
}
