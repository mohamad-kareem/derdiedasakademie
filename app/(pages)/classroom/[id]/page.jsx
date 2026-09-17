import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, Lock, Ban, Video, ArrowLeft, Settings } from "lucide-react";
import ClassroomApp from "@/components/classroom/ClassroomApp";
import { requireUser } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { classroomAccess, OPEN_BEFORE_MIN } from "@/lib/classroom";
import { createClassToken, isLiveKitConfigured } from "@/lib/livekit";
import { isStorageConfigured } from "@/lib/storage";
import { fileKind } from "@/lib/files-client";
import ChatMessage from "@/models/ChatMessage";
import Poll from "@/models/Poll";
import VocabItem from "@/models/VocabItem";
import Resource from "@/models/Resource";
import { formatDateTime, plain } from "@/lib/utils";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("classroom.title") };
}

function StatusScreen({ icon: I, title, text, back, backLabel }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-navy-950 p-6 text-center text-white">
      <span className="flex size-14 items-center justify-center rounded-full bg-white/10 text-gold-400"><I className="size-6" /></span>
      <h1 className="mt-2 text-2xl font-semibold">{title}</h1>
      {text && <p className="max-w-md text-white/60">{text}</p>}
      <Link href={back} className="btn btn-gold mt-4"><ArrowLeft className="size-4 rtl:rotate-180" /> {backLabel}</Link>
    </div>
  );
}

export default async function ClassroomPage({ params }) {
  const { id } = await params;
  const user = await requireUser();
  const { t, locale } = await getI18n();
  const access = await classroomAccess(user, id);
  if (access.reason === "notFound") notFound();

  const isTeacher = user.role === "admin";
  const back = access.course ? (isTeacher ? `/admin/courses/${access.course._id}` : `/dashboard/courses/${access.course._id}`) : "/";
  const backLabel = t("classroom.backToCourse");

  if (!isLiveKitConfigured()) {
    return <StatusScreen icon={Settings} title={t("classroom.notConfigured")} text={isTeacher ? t("classroom.notConfiguredAdmin") : t("classroom.notConfiguredStudent")} back={back} backLabel={backLabel} />;
  }
  if (access.course?.classroom === "external" && !isTeacher) {
    return <StatusScreen icon={Video} title={t("classroom.externalTitle")} text={t("classroom.externalText")} back={back} backLabel={backLabel} />;
  }
  if (access.reason === "tooEarly") {
    return <StatusScreen icon={Clock} title={t("classroom.tooEarly")} text={t("classroom.tooEarlyText", { time: formatDateTime(access.lesson.startsAt, locale), min: OPEN_BEFORE_MIN })} back={back} backLabel={backLabel} />;
  }
  if (access.reason === "locked") return <StatusScreen icon={Lock} title={t("classroom.locked")} text={t("classroom.lockedText")} back={back} backLabel={backLabel} />;
  if (access.reason === "ended") return <StatusScreen icon={Clock} title={t("classroom.endedTitle")} text={t("classroom.endedText")} back={back} backLabel={backLabel} />;
  if (access.reason) return <StatusScreen icon={Ban} title={t("classroom.noAccess")} text={t("classroom.noAccessText")} back={back} backLabel={backLabel} />;

  const { lesson, course } = access;
  const [token, messages, poll, vocab, resources] = await Promise.all([
    createClassToken({ user, lessonId: id, isTeacher }),
    ChatMessage.find({ lesson: id }).sort({ createdAt: -1 }).limit(150).lean(),
    Poll.findOne({ lesson: id, status: "open" }).lean(),
    VocabItem.find({ course: course._id }).sort({ createdAt: -1 }).limit(300).lean(),
    isTeacher ? Resource.find({ course: course._id }).select("attachments").lean() : [],
  ]);

  const docs = isTeacher
    ? [...(lesson.attachments || []), ...resources.flatMap((r) => r.attachments || [])].filter((f) => ["pdf", "image"].includes(fileKind(f)))
    : [];
  const pollData = poll
    ? { ...poll, responses: isTeacher ? poll.responses : poll.responses.filter((r) => String(r.user) === user.id) }
    : null;

  return (
    <ClassroomApp
      serverUrl={process.env.LIVEKIT_URL}
      token={token}
      me={{ id: user.id, name: user.name }}
      isTeacher={isTeacher}
      lesson={plain({ _id: lesson._id, title: lesson.title, startsAt: lesson.startsAt, durationMin: lesson.durationMin })}
      course={plain({ _id: course._id, title: course.title, level: course.level })}
      docs={plain(docs)}
      initial={plain({
        messages: messages.reverse().map((m) => ({ _id: m._id, user: m.user, name: m.name, role: m.role, text: m.text, attachment: m.attachment, createdAt: m.createdAt })),
        poll: pollData,
        vocab,
      })}
      storage={isStorageConfigured()}
      initiallyLocked={Boolean(lesson.roomLocked)}
      backHref={back}
    />
  );
}
