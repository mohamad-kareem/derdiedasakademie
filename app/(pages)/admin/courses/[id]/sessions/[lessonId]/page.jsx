import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Video, Users, ListChecks, MessageSquare, BookA, CheckCircle2 } from "lucide-react";
import { Panel, EmptyState, StatCard } from "@/components/ui/Blocks";
import { StatusBadge } from "@/components/ui/Badges";
import { ARTICLE_COLORS } from "@/components/classroom/boardDraw";
import { requireAdmin } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { isId } from "@/lib/validate";
import connectDB from "@/lib/mongodb";
import Lesson from "@/models/Lesson";
import Course from "@/models/Course";
import Enrollment from "@/models/Enrollment";
import Attendance from "@/models/Attendance";
import Poll from "@/models/Poll";
import ChatMessage from "@/models/ChatMessage";
import VocabItem from "@/models/VocabItem";
import "@/models/User";
import { fileUrl } from "@/lib/files-client";
import { formatDateTime, formatTime, nowMs, plain } from "@/lib/utils";

export default async function SessionReportPage({ params }) {
  const { id, lessonId } = await params;
  if (!isId(id) || !isId(lessonId)) notFound();
  await requireAdmin();
  const { t, locale } = await getI18n();
  await connectDB();
  const [lesson, course] = await Promise.all([Lesson.findOne({ _id: lessonId, course: id }).lean(), Course.findById(id).lean()]);
  if (!lesson || !course) notFound();

  const [enrollments, attendance, polls, messages, vocab] = plain(
    await Promise.all([
      Enrollment.find({ course: id, status: { $in: ["active", "completed"] } }).populate("student", "name email").lean(),
      Attendance.find({ lesson: lessonId }).populate("user", "name email role").lean(),
      Poll.find({ lesson: lessonId }).sort({ createdAt: 1 }).lean(),
      ChatMessage.find({ lesson: lessonId }).sort({ createdAt: 1 }).limit(500).lean(),
      VocabItem.find({ lesson: lessonId }).sort({ createdAt: 1 }).lean(),
    ]),
  );
  const attByUser = Object.fromEntries(attendance.map((a) => [a.user?._id, a]));
  const roster = enrollments.filter((e) => e.student).map((e) => ({ student: e.student, att: attByUser[e.student._id] }));
  const present = roster.filter((r) => r.att).length;
  const past = new Date(lesson.startsAt).getTime() + lesson.durationMin * 60000 < nowMs();

  return (
    <>
      <Link href={`/admin/courses/${id}`} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-navy-900">
        <ArrowLeft className="size-4 rtl:rotate-180" /> {course.title}
      </Link>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted">{formatDateTime(lesson.startsAt, locale)} · {lesson.durationMin} {t("lessons.min")}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-navy-900">{lesson.title}</h1>
        </div>
        {course.classroom !== "external" && <Link href={`/classroom/${lessonId}`} className="btn btn-gold"><Video className="size-4" /> {past ? t("classroom.openRoom") : t("classroom.startClass")}</Link>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("classroom.attendance")} value={`${present}/${roster.length}`} icon={<Users className="size-5" />} tone="green" />
        <StatCard label={t("classroom.panels.words")} value={vocab.length} icon={<BookA className="size-5" />} />
        <StatCard label={t("classroom.report.polls")} value={polls.length} icon={<ListChecks className="size-5" />} tone="gold" />
        <StatCard label={t("classroom.report.messages")} value={messages.length} icon={<MessageSquare className="size-5" />} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Panel title={t("classroom.attendance")} bodyClassName="overflow-x-auto">
            {roster.length ? (
              <table className="data-table">
                <thead><tr><th>{t("admin.students.student")}</th><th>{t("classroom.report.joined")}</th><th>{t("classroom.report.minutes")}</th><th>{t("admin.fields.status")}</th></tr></thead>
                <tbody>
                  {roster.map(({ student, att }) => (
                    <tr key={student._id}>
                      <td><Link href={`/admin/students/${student._id}`} className="font-medium text-ink hover:underline">{student.name}</Link><p className="text-xs text-muted">{student.email}</p></td>
                      <td className="text-muted">{att ? formatTime(att.firstJoinedAt, locale) : "—"}</td>
                      <td>{att ? Math.max(1, Math.round(att.seconds / 60)) : "—"}</td>
                      <td>{att ? <StatusBadge status="active" label={t("classroom.present")} /> : <StatusBadge status={past ? "rejected" : "draft"} label={past ? t("classroom.missed") : "—"} />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <EmptyState icon={<Users className="size-5" />} title={t("admin.course.noStudents")} />}
          </Panel>

          <Panel title={t("classroom.report.polls")} bodyClassName="divide-y divide-line">
            {polls.length ? polls.map((p) => {
              const total = p.responses.length;
              return (
                <div key={p._id} className="px-4 py-3">
                  <p className="text-sm font-semibold text-ink" dir="auto">{p.question}</p>
                  <ul className="mt-2 space-y-1">
                    {p.options.map((o, i) => {
                      const n = p.responses.filter((r) => r.choice === i).length;
                      return (
                        <li key={i} className="flex items-center gap-2 text-xs">
                          <span className="w-40 truncate" dir="auto">{p.correctIndex === i && <CheckCircle2 className="me-1 inline size-3.5 text-emerald-600" />}{o}</span>
                          <span className="h-1.5 flex-1 overflow-hidden bg-canvas"><span className="block h-full bg-navy-700" style={{ width: `${total ? (n / total) * 100 : 0}%` }} /></span>
                          <span className="w-10 text-end text-muted">{n}</span>
                        </li>
                      );
                    })}
                  </ul>
                  {p.correctIndex >= 0 && total > 0 && (
                    <p className="mt-2 text-xs text-muted">
                      {t("classroom.report.correct")}: {p.responses.filter((r) => r.choice === p.correctIndex).map((r) => r.name).join(", ") || "—"}
                    </p>
                  )}
                </div>
              );
            }) : <EmptyState icon={<ListChecks className="size-5" />} title={t("classroom.report.noPolls")} />}
          </Panel>

          <Panel title={t("classroom.report.chat")} bodyClassName="max-h-[480px] space-y-2 overflow-y-auto p-4">
            {messages.length ? messages.map((m) => (
              <div key={m._id} className="text-sm">
                <span className="text-xs text-muted">{formatTime(m.createdAt, locale)}</span>{" "}
                <span className={m.role === "teacher" ? "font-semibold text-gold-600" : "font-semibold text-navy-900"}>{m.name}:</span>{" "}
                <span className="text-ink/85" dir="auto">{m.text}</span>
                {m.attachment && <a href={fileUrl(m.attachment)} className="link ms-2 text-xs">📎 {m.attachment.name}</a>}
              </div>
            )) : <EmptyState icon={<MessageSquare className="size-5" />} title={t("classroom.chat.empty")} />}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title={t("classroom.panels.words")} bodyClassName="divide-y divide-line">
            {vocab.length ? vocab.map((v) => (
              <div key={v._id} className="px-4 py-2.5 text-sm" dir="ltr">
                {v.article !== "none" && <span className="font-semibold" style={{ color: ARTICLE_COLORS[v.article] }}>{v.article} </span>}
                <span className="font-semibold">{v.word}</span>
                {v.meaning && <span className="ms-2 text-xs text-muted" dir="auto">{v.meaning}</span>}
              </div>
            )) : <EmptyState icon={<BookA className="size-5" />} title={t("classroom.words.empty")} />}
          </Panel>
        </div>
      </div>
    </>
  );
}
