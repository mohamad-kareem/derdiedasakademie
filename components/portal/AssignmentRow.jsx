"use client";

import { useState } from "react";
import { ClipboardList, ExternalLink, MessageSquareText } from "lucide-react";
import Modal from "@/components/ui/Modal";
import ActionForm, { SubmitButton } from "@/components/ui/ActionForm";
import { StatusBadge, LevelBadge } from "@/components/ui/Badges";
import { useI18n } from "@/components/I18nProvider";
import { submitAssignment } from "@/app/actions/student";

export default function AssignmentRow({ assignment, showCourse = true }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const s = assignment.submission;
  const graded = assignment.state === "graded";

  return (
    <>
      <div className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-gold-50 text-gold-600"><ClipboardList className="size-4" /></span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-ink">{assignment.title}</p>
              <StatusBadge status={assignment.state === "todo" ? "pending" : assignment.state} label={t(`assignments.state.${assignment.state}`)} />
            </div>
            <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted">
              {showCourse && assignment.course && <><LevelBadge level={assignment.course.level} /> <span>{assignment.course.title}</span> ·</>}
              <span>{assignment.dueDate ? t("assignments.due", { date: assignment.dueText }) : t("assignments.noDue")}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 sm:justify-end">
          {graded && (
            <span className="text-sm font-semibold text-navy-900" dir="ltr">
              {s.grade}<span className="text-muted">/{assignment.maxPoints}</span>
            </span>
          )}
          <button type="button" onClick={() => setOpen(true)} className={`btn btn-sm ${assignment.state === "todo" || assignment.state === "missing" ? "btn-primary" : "btn-outline"}`}>
            {graded ? t("assignments.viewFeedback") : s ? t("assignments.editSubmission") : t("assignments.submit")}
          </button>
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={assignment.title} description={assignment.course?.title} size="lg">
        <div className="space-y-5">
          {assignment.instructions && (
            <div>
              <p className="label">{t("assignments.instructions")}</p>
              <div className="prose-text rounded-lg border border-line bg-canvas/50 p-4">{assignment.instructions}</div>
            </div>
          )}
          {assignment.resourceUrl && (
            <a href={assignment.resourceUrl} target="_blank" rel="noopener noreferrer" className="link inline-flex items-center gap-1.5 text-sm">
              <ExternalLink className="size-4" /> {t("assignments.openResource")}
            </a>
          )}
          {graded ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg bg-emerald-50 p-4">
                <span className="text-sm font-medium text-emerald-800">{t("assignments.grade")}</span>
                <span className="text-2xl font-semibold text-emerald-800" dir="ltr">{s.grade} / {assignment.maxPoints}</span>
              </div>
              {s.feedback && (
                <div>
                  <p className="label flex items-center gap-1.5"><MessageSquareText className="size-3.5" /> {t("assignments.feedback")}</p>
                  <div className="prose-text rounded-lg border border-line p-4">{s.feedback}</div>
                </div>
              )}
              <div>
                <p className="label">{t("assignments.yourAnswer")}</p>
                <div className="prose-text rounded-lg border border-line bg-canvas/50 p-4">{s.text || "—"}</div>
                {s.linkUrl && <a href={s.linkUrl} target="_blank" rel="noopener noreferrer" className="link mt-2 inline-block text-sm">{s.linkUrl}</a>}
              </div>
            </div>
          ) : (
            <ActionForm action={submitAssignment.bind(null, assignment._id)} onSuccess={() => setOpen(false)} className="space-y-4">
              <label className="block">
                <span className="label">{t("assignments.yourAnswer")}</span>
                <textarea name="text" rows={8} defaultValue={s?.text || ""} className="input" placeholder={t("assignments.answerPlaceholder")} />
              </label>
              <label className="block">
                <span className="label">{t("assignments.link")}</span>
                <input name="linkUrl" defaultValue={s?.linkUrl || ""} className="input" placeholder="https://drive.google.com/…" dir="ltr" />
                <span className="hint block">{t("assignments.linkHint")}</span>
              </label>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setOpen(false)} className="btn btn-outline">{t("common.cancel")}</button>
                <SubmitButton>{s ? t("assignments.update") : t("assignments.submit")}</SubmitButton>
              </div>
            </ActionForm>
          )}
        </div>
      </Modal>
    </>
  );
}
