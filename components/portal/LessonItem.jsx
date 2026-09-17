import { Video, PlayCircle, FileText, Clock } from "lucide-react";
import { LevelBadge } from "@/components/ui/Badges";
import { lessonState } from "@/lib/student-data";
import { cn, formatDate, formatTime } from "@/lib/utils";

export default function LessonItem({ lesson, t, locale, showCourse = false, canJoin = true }) {
  const state = lessonState(lesson);
  const joinUrl = lesson.meetingUrl || lesson.course?.meetingUrl;
  const d = new Date(lesson.startsAt);
  return (
    <div className={cn("flex gap-4 px-4 py-3.5", state === "live" && "bg-red-50/50")}>
      <div className={cn("flex w-14 shrink-0 flex-col items-center justify-center rounded-lg border py-1.5 text-center", state === "past" ? "border-line bg-canvas text-muted" : "border-navy-100 bg-navy-50 text-navy-900")}>
        <span className="text-[10px] font-semibold uppercase">{formatDate(d, locale, { month: "short", day: undefined, year: undefined })}</span>
        <span className="text-lg font-semibold leading-tight">{formatDate(d, locale, { day: "numeric", month: undefined, year: undefined })}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {showCourse && lesson.course && <LevelBadge level={lesson.course.level} />}
          <p className="truncate text-sm font-semibold text-ink">{lesson.title}</p>
          {state === "live" && <span className="badge bg-red-600 text-white">{t("lessons.liveNow")}</span>}
        </div>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-muted">
          <span className="inline-flex items-center gap-1"><Clock className="size-3.5" /> {formatTime(d, locale)} · {lesson.durationMin} {t("lessons.min")}</span>
          {showCourse && lesson.course && <span className="truncate">{lesson.course.title}</span>}
        </p>
        {lesson.description && <p className="mt-1.5 line-clamp-2 text-xs text-ink/70">{lesson.description}</p>}
        {(lesson.materials?.length > 0 || lesson.recordingUrl) && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {lesson.recordingUrl && (
              <a href={lesson.recordingUrl} target="_blank" rel="noopener noreferrer" className="badge bg-navy-50 text-navy-700 hover:bg-navy-100">
                <PlayCircle className="size-3" /> {t("lessons.recording")}
              </a>
            )}
            {lesson.materials?.map((m, i) => (
              <a key={i} href={m.url} target="_blank" rel="noopener noreferrer" className="badge bg-gold-50 text-gold-600 hover:bg-gold-100">
                <FileText className="size-3" /> {m.title}
              </a>
            ))}
          </div>
        )}
      </div>
      {canJoin && state !== "past" && joinUrl && (
        <a href={joinUrl} target="_blank" rel="noopener noreferrer" className={cn("btn btn-sm self-center", state === "live" ? "btn-danger" : "btn-outline")}>
          <Video className="size-3.5" /> {t("lessons.join")}
        </a>
      )}
    </div>
  );
}
