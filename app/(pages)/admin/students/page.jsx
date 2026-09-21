import Link from "next/link";
import { Search, Users } from "lucide-react";
import { PageHeader, EmptyState, Breadcrumb } from "@/components/ui/Blocks";
import { LevelBadge, StatusBadge } from "@/components/ui/Badges";
import { requireStaff } from "@/lib/auth";
import { can, portalKey } from "@/lib/roles";
import { getI18n } from "@/lib/i18n/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Enrollment from "@/models/Enrollment";
import { LEVELS } from "@/lib/constants";
import { formatDate, initials, plain } from "@/lib/utils";

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default async function StudentsPage({ searchParams }) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 80) : "";
  const level = [...LEVELS, "unknown"].includes(sp.level) ? sp.level : "";
  const user = await requireStaff();
  const { t, locale } = await getI18n();
  await connectDB();

  const query = { role: "student" };
  if (q) query.$or = [{ name: new RegExp(escapeRegex(q), "i") }, { email: new RegExp(escapeRegex(q), "i") }, { phone: new RegExp(escapeRegex(q), "i") }];
  if (level) query.level = level;
  const students = plain(await User.find(query).sort({ createdAt: -1 }).limit(500).lean());
  const counts = await Enrollment.aggregate([
    { $match: { student: { $in: students.map((s) => new mongoose.Types.ObjectId(s._id)) }, status: "active" } },
    { $group: { _id: "$student", n: { $sum: 1 } } },
  ]);
  const active = Object.fromEntries(counts.map((c) => [String(c._id), c.n]));

  return (
    <>
      <PageHeader title={t("admin.nav.students")} description={t("admin.students.subtitle", { n: students.length })} >
        <Breadcrumb trail={[t(portalKey(user)), t("admin.nav.students")]} />
      </PageHeader>
      <form className="mb-4 flex flex-col gap-2 sm:flex-row" action="/admin/students">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input name="q" defaultValue={q} placeholder={t("admin.students.search")} className="input ps-9" />
        </div>
        <select name="level" defaultValue={level} className="input sm:w-44">
          <option value="">{t("courses.allLevels")}</option>
          {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
          <option value="unknown">{t("form.levelUnknown")}</option>
        </select>
        <button className="btn btn-primary">{t("common.filter")}</button>
      </form>
      <div className="card overflow-hidden">
        {students.length ? (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>{t("admin.students.student")}</th><th>{t("form.phone")}</th><th>{t("admin.fields.level")}</th><th>{t("admin.students.activeCourses")}</th><th>{t("admin.students.joined")}</th><th>{t("admin.fields.status")}</th></tr></thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s._id} className="hover:bg-canvas/40">
                    <td>
                      <Link href={`/admin/students/${s._id}`} className="flex items-center gap-3">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-[2px] bg-navy-50 text-xs font-semibold text-navy-700">{initials(s.name)}</span>
                        <span><span className="block font-medium text-ink hover:underline">{s.name}</span><span className="block text-xs text-muted">{s.email}</span></span>
                      </Link>
                    </td>
                    <td className="text-muted" dir="ltr">{s.phone || "—"}</td>
                    <td><LevelBadge level={s.level} /></td>
                    <td>{active[s._id] || 0}</td>
                    <td className="whitespace-nowrap text-muted">{formatDate(s.createdAt, locale)}</td>
                    <td><StatusBadge status={s.isActive ? "active" : "rejected"} label={s.isActive ? t("admin.students.enabled") : t("admin.students.disabled")} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState icon={<Users className="size-5" />} title={t("admin.students.empty")} />}
      </div>
    </>
  );
}
