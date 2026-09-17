import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { PageHeader, Panel, EmptyState } from "@/components/ui/Blocks";
import AssignmentRow from "@/components/portal/AssignmentRow";
import { requireStudent } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { getMyEnrollments, accessibleCourseIds, getMyAssignments } from "@/lib/student-data";
import { cn } from "@/lib/utils";

const FILTERS = ["todo", "submitted", "graded", "all"];

export default async function AssignmentsPage({ searchParams }) {
  const { filter: raw } = await searchParams;
  const filter = FILTERS.includes(raw) ? raw : "todo";
  const user = await requireStudent();
  const { t, locale } = await getI18n();
  const enrollments = await getMyEnrollments(user.id);
  const all = await getMyAssignments(user.id, accessibleCourseIds(enrollments), locale);
  const match = (a) => filter === "all" || (filter === "todo" ? a.state === "todo" || a.state === "missing" : a.state === filter);
  const counts = Object.fromEntries(FILTERS.map((f) => [f, all.filter((a) => f === "all" || (f === "todo" ? a.state === "todo" || a.state === "missing" : a.state === f)).length]));
  const list = all.filter(match);

  return (
    <>
      <PageHeader title={t("student.nav.assignments")} description={t("student.assignments.subtitle")} />
      <div className="mb-4 flex flex-wrap gap-1 rounded-lg border border-line bg-white p-1 sm:inline-flex">
        {FILTERS.map((f) => (
          <Link key={f} href={`/dashboard/assignments?filter=${f}`} className={cn("rounded-md px-3 py-1.5 text-sm font-medium", filter === f ? "bg-navy-900 text-white" : "text-muted hover:bg-canvas")}>
            {t(`student.assignments.filters.${f}`)} <span className="ms-1 text-xs opacity-70">{counts[f]}</span>
          </Link>
        ))}
      </div>
      <Panel bodyClassName="divide-y divide-line">
        {list.length ? list.map((a) => <AssignmentRow key={a._id} assignment={a} />) : <EmptyState icon={<ClipboardList className="size-5" />} title={t("student.assignments.empty")} />}
      </Panel>
    </>
  );
}
