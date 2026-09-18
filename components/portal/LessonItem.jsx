import Link from "next/link";
import { Video, Link2, Clock, CheckCircle2, XCircle } from "lucide-react";
import { LevelBadge } from "@/components/ui/Badges";
import FileIcon from "@/components/files/FileIcon";
import { lessonState } from "@/lib/student-data";
import { fileUrl } from "@/lib/files-client";
import { cn, formatDate, formatTime } from "@/lib/utils";

export default function LessonItem({ lesson, t, locale, showCourse = false, canJoin = true, attendance, isTeacher = false }) {
  const state = lessonState(lesson);
  const course = lesson.course || {};
  const builtin = course.classroom !== "external";
  const joinHref = builtin ? `/classroom/${lesson._id}` : lesson.meetingUrl || course.meetingUrl;
  const d = new Date(lesson.startsAt);
  const openSoon = state === "live" || isTeacher;

  return (
    <div className={cn("flex gap-3.5 px-3.5 py-3", state === "live" && "border-s-[3px] border-red-700 bg-red-50/40 ps-3")}>
      <div className={cn("flex w-12 shrink-0 flex-col items-center justify-center rounded-[2px] border py-1.5 text-center", state === "past" ? "border-line bg-canvas text-muted" : "border-navy-100 bg-navy-50 text-navy-900")}>
        <span className="text-[10px] font-semibold uppercase">{formatDate(d, locale, { month: "short", day: undefined, year: undefined })}</span>
        <span className="text-[17px] font-semibold leading-tight tabular">{formatDate(d, locale, { day: "numeric", month: undefined, year: undefined })}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {showCourse && lesson.course && <LevelBadge level={lesson.course.level} />}
          <p className="truncate text-sm font-semibold text-ink">{lesson.title}</p>
          {state === "live" && <span className="badge border border-red-700 bg-red-700 text-white">{t("lessons.liveNow")}</span>}
          {state === "past" && attendance !== undefined && (
            attendance ? (
              <span className="badge border border-emerald-700/25 bg-emerald-50 text-emerald-800"><CheckCircle2 className="size-3" /> {t("classroom.attendedMin", { n: Math.max(1, Math.round(attendance.seconds / 60)) })}</span>
            ) : (
              <span className="badge border border-line-strong bg-cream text-muted"><XCircle className="size-3" /> {t("classroom.missed")}</span>
            )
          )}
        </div>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-muted">
          <span className="inline-flex items-center gap-1"><Clock className="size-3.5" /> {formatTime(d, locale)} · {lesson.durationMin} {t("lessons.min")}</span>
          {showCourse && lesson.course && <span className="truncate">{lesson.course.title}</span>}
        </p>
        {lesson.description && <p className="mt-1.5 line-clamp-2 text-xs text-ink/70">{lesson.description}</p>}
        {(lesson.materials?.length > 0 || lesson.attachments?.length > 0) && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {lesson.attachments?.map((f) => (
              <a key={f.key} href={fileUrl(f, { inline: true })} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-56 items-center gap-1.5 rounded-[2px] border border-line bg-white py-0.5 pe-2 ps-0.5 text-[11px] font-medium text-ink hover:border-navy-600">
                <FileIcon file={f} className="size-5 rounded-[2px]" /> <span className="truncate" dir="ltr">{f.name}</span>
              </a>
            ))}
            {lesson.materials?.map((m, i) => (
              <a key={i} href={m.url} target="_blank" rel="noopener noreferrer" className="badge border border-gold-600/25 bg-gold-50 text-gold-600 hover:bg-gold-100">
                <Link2 className="size-3" /> {m.title}
              </a>
            ))}
          </div>
        )}
      </div>
      {canJoin && state !== "past" && joinHref && (
        builtin ? (
          <Link href={joinHref} className={cn("btn btn-sm self-center", state === "live" ? "btn-danger" : openSoon ? "btn-primary" : "btn-outline")}>
            <Video className="size-3.5" /> {isTeacher ? t("classroom.startClass") : t("lessons.join")}
          </Link>
        ) : (
          <a href={joinHref} target="_blank" rel="noopener noreferrer" className={cn("btn btn-sm self-center", state === "live" ? "btn-danger" : "btn-outline")}>
            <Video className="size-3.5" /> {t("lessons.join")}
          </a>
        )
      )}
    </div>
  );
}
