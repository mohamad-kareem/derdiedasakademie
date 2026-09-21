import Link from "next/link";
import { FileCheck2, ExternalLink, RotateCcw } from "lucide-react";
import { PageHeader, EmptyState, Breadcrumb } from "@/components/ui/Blocks";
import { LevelBadge, StatusBadge } from "@/components/ui/Badges";
import FormModal from "@/components/admin/FormModal";
import ActionButton from "@/components/ui/ActionButton";
import { requireStaff } from "@/lib/auth";
import { isOwner, ownCoursesFilter, portalKey } from "@/lib/roles";
import { getI18n } from "@/lib/i18n/server";
import { isId } from "@/lib/validate";
import connectDB from "@/lib/mongodb";
import Submission from "@/models/Submission";
import Course from "@/models/Course";
import "@/models/User";
import "@/models/Assignment";
import { gradeSubmission, reopenSubmission } from "@/app/actions/admin";
import AttachmentList from "@/components/files/AttachmentList";
import FileUploader from "@/components/files/FileUploader";
import { isStorageConfigured } from "@/lib/storage";
import { cn, formatDateTime, plain } from "@/lib/utils";

export default async function GradingPage({ searchParams }) {
  const sp = await searchParams;
  const status = sp.status === "graded" ? "graded" : "submitted";
  const course = isId(sp.course) ? sp.course : "";
  const user = await requireStaff();
  const { t, locale } = await getI18n();
  await connectDB();

  // A teacher grades the work handed in for their own courses; the owner sees all.
  const scope = await Course.find({ status: { $ne: "archived" }, ...ownCoursesFilter(user) }).select("title level").sort({ startDate: -1 }).lean();
  const allowed = scope.map((c) => String(c._id));

  const query = { status };
  if (course && allowed.includes(course)) query.course = course;
  else if (!isOwner(user)) query.course = { $in: scope.map((c) => c._id) };
  const [subs, courses] = plain(
    await Promise.all([
      Submission.find(query).populate("student", "name email").populate("assignment", "title maxPoints dueDate instructions").populate("course", "title level").sort({ updatedAt: status === "submitted" ? 1 : -1 }).limit(200).lean(),
      scope,
    ]),
  );
  const list = subs.filter((s) => s.student && s.assignment);
  const href = (patch) => {
    const p = new URLSearchParams({ status, ...(course ? { course } : {}), ...patch });
    [...p.entries()].forEach(([k, v]) => !v && p.delete(k));
    return `/admin/grading?${p}`;
  };

  return (
    <>
      <PageHeader title={t("admin.nav.grading")} description={t("admin.grading.subtitle")} >
        <Breadcrumb trail={[t(portalKey(user)), t("admin.nav.grading")]} />
      </PageHeader>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex rounded-[3px] border border-line bg-white p-1">
          {["submitted", "graded"].map((s) => (
            <Link key={s} href={href({ status: s })} className={cn("rounded-[3px] px-3 py-1.5 text-xs font-medium", status === s ? "bg-navy-900 text-white" : "text-muted hover:bg-canvas")}>
              {t(`admin.grading.filters.${s}`)}
            </Link>
          ))}
        </div>
        <form action="/admin/grading" className="flex gap-2">
          <input type="hidden" name="status" value={status} />
          <select name="course" defaultValue={course} className="input h-9 sm:w-64">
            <option value="">{t("admin.grading.allCourses")}</option>
            {courses.map((c) => <option key={c._id} value={c._id}>{c.level} · {c.title}</option>)}
          </select>
          <button className="btn btn-outline h-9">{t("common.filter")}</button>
        </form>
      </div>

      {list.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {list.map((s) => {
            const late = s.assignment.dueDate && new Date(s.updatedAt) > new Date(s.assignment.dueDate);
            return (
              <div key={s._id} className="card flex flex-col p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">{s.assignment.title}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted"><LevelBadge level={s.course?.level} /> {s.course?.title}</p>
                  </div>
                  {s.status === "graded" ? <span className="text-lg font-semibold text-navy-900" dir="ltr">{s.grade}/{s.assignment.maxPoints}</span> : <StatusBadge status={late ? "missing" : "submitted"} label={late ? t("admin.grading.late") : t("assignments.state.submitted")} />}
                </div>
                <p className="mt-3 text-xs text-muted"><Link href={`/admin/students/${s.student._id}`} className="font-medium text-ink hover:underline">{s.student.name}</Link> · {formatDateTime(s.updatedAt, locale)}</p>
                <div className="prose-text mt-2 line-clamp-4 flex-1 rounded-[3px] bg-canvas/60 p-3 text-[13px]">{s.text || "—"}</div>
                {s.linkUrl && <a href={s.linkUrl} target="_blank" rel="noopener noreferrer" className="link mt-2 inline-flex items-center gap-1 text-xs"><ExternalLink className="size-3.5" /> {t("admin.grading.openLink")}</a>}
                <AttachmentList files={s.attachments} t={t} dense className="mt-2" />
                {s.status === "graded" && s.feedback && <p className="mt-2 line-clamp-2 border-s-2 border-gold-400 ps-2 text-xs text-muted">{s.feedback}</p>}
                <div className="mt-3 flex justify-end gap-2 border-t border-line pt-3">
                  {s.status === "graded" && <ActionButton action={reopenSubmission.bind(null, s._id)} confirm className="btn-ghost"><RotateCcw className="size-3.5" /> {t("admin.grading.reopen")}</ActionButton>}
                  <FormModal
                    trigger={s.status === "graded" ? t("admin.grading.editGrade") : t("admin.grading.grade")}
                    triggerClassName={s.status === "graded" ? "btn-outline btn-sm" : "btn-primary btn-sm"}
                    title={s.assignment.title}
                    description={`${s.student.name} · ${s.course?.level} ${s.course?.title}`}
                    action={gradeSubmission.bind(null, s._id)}
                    submitLabel={t("admin.grading.saveGrade")}
                    size="lg"
                  >
                    <div className="sm:col-span-2">
                      <p className="label">{t("assignments.yourAnswer")}</p>
                      <div className="prose-text max-h-72 overflow-y-auto rounded-[3px] border border-line bg-canvas/50 p-4">{s.text || "—"}</div>
                      {s.linkUrl && <a href={s.linkUrl} target="_blank" rel="noopener noreferrer" className="link mt-2 inline-flex items-center gap-1 text-sm"><ExternalLink className="size-4" /> {s.linkUrl}</a>}
                      <AttachmentList files={s.attachments} t={t} className="mt-2" />
                    </div>
                    <label className="block">
                      <span className="label">{t("assignments.grade")} (0–{s.assignment.maxPoints})</span>
                      <input type="number" name="grade" min="0" max={s.assignment.maxPoints} step="0.5" required defaultValue={s.grade ?? ""} className="input" />
                    </label>
                    <div />
                    <label className="block sm:col-span-2">
                      <span className="label">{t("assignments.feedback")}</span>
                      <textarea name="feedback" rows={5} defaultValue={s.feedback} className="input" placeholder={t("admin.grading.feedbackPlaceholder")} />
                    </label>
                    <div className="sm:col-span-2">
                      <span className="label">{t("files.feedbackFiles")}</span>
                      <FileUploader name="feedbackAttachments" scope="feedback" courseId={s.course?._id} studentId={s.student._id} initial={s.feedbackAttachments || []} enabled={isStorageConfigured()} max={5} compact />
                      <span className="hint block">{t("files.feedbackHint")}</span>
                    </div>
                  </FormModal>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card"><EmptyState icon={<FileCheck2 className="size-5" />} title={status === "submitted" ? t("admin.grading.empty") : t("admin.grading.none")} /></div>
      )}
    </>
  );
}
