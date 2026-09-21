"use server";

import { revalidatePath } from "next/cache";
import connectDB from "@/lib/mongodb";
import { actionUser } from "@/lib/auth";
import { classroomAccess } from "@/lib/classroom";
import { roomService, roomNameFor, isLiveKitConfigured, PRESENTER_SOURCES, STUDENT_SOURCES } from "@/lib/livekit";
import { isId, fail, done } from "@/lib/validate";
import Lesson from "@/models/Lesson";
import Attendance from "@/models/Attendance";
import ChatMessage from "@/models/ChatMessage";
import Poll from "@/models/Poll";
import VocabItem from "@/models/VocabItem";
import { plain } from "@/lib/utils";

async function inRoom(lessonId, { teacherOnly = false } = {}) {
  const user = await actionUser();
  if (!user) return {};
  const access = await classroomAccess(user, lessonId);
  if (access.reason || (teacherOnly && !access.isTeacher)) return {};
  return { user, ...access };
}

function serializeMessage(m) {
  return plain({ _id: m._id, user: m.user, name: m.name, role: m.role, text: m.text, attachment: m.attachment, createdAt: m.createdAt });
}

/* ---------- presence ---------- */

export async function heartbeat(lessonId) {
  const { user, lesson } = await inRoom(lessonId);
  if (!user) return fail("errors.forbidden");
  const now = new Date();
  const existing = await Attendance.findOne({ lesson: lessonId, user: user.id });
  if (!existing) {
    await Attendance.create({ lesson: lessonId, course: lesson.course, user: user.id, firstJoinedAt: now, lastSeenAt: now });
  } else {
    const gap = (now - existing.lastSeenAt) / 1000;
    existing.seconds += gap <= 150 ? gap : 0; // count time only between regular heartbeats
    existing.lastSeenAt = now;
    await existing.save();
  }
  return { ok: true };
}

/* ---------- chat ---------- */

export async function sendChatMessage(lessonId, { text = "", attachment = null }) {
  const { user, course } = await inRoom(lessonId);
  if (!user) return fail("errors.forbidden");
  const prefix = `courses/${course._id}/chat/`;
  const file =
    attachment && typeof attachment.key === "string" && attachment.key.startsWith(prefix) && !attachment.key.includes("..")
      ? { key: attachment.key, name: String(attachment.name || "file").slice(0, 160), size: Number(attachment.size) || 0, type: String(attachment.type || "").slice(0, 120) }
      : null;
  const clean = String(text).trim().slice(0, 2000);
  if (!clean && !file) return fail("errors.generic");
  const msg = await ChatMessage.create({ lesson: lessonId, user: user.id, name: user.name, role: access.isTeacher ? "teacher" : "student", text: clean, attachment: file });
  return { ok: true, data: serializeMessage(msg) };
}

/* ---------- polls ---------- */

export async function createPoll(lessonId, { question, options, correctIndex }) {
  const { user, course } = await inRoom(lessonId, { teacherOnly: true });
  if (!user) return fail("errors.forbidden");
  const q = String(question || "").trim().slice(0, 300);
  const opts = (Array.isArray(options) ? options : []).map((o) => String(o).trim().slice(0, 120)).filter(Boolean).slice(0, 6);
  if (!q || opts.length < 2) return fail("classroom.quiz.invalid");
  await Poll.updateMany({ lesson: lessonId, status: "open" }, { status: "closed" });
  const ci = Number(correctIndex);
  const poll = await Poll.create({ lesson: lessonId, course: course._id, question: q, options: opts, correctIndex: Number.isInteger(ci) && ci >= 0 && ci < opts.length ? ci : -1 });
  return { ok: true, data: plain({ _id: poll._id, question: poll.question, options: poll.options, correctIndex: poll.correctIndex, status: "open", responses: [] }) };
}

export async function answerPoll(lessonId, pollId, choice) {
  const { user } = await inRoom(lessonId);
  if (!user || !isId(pollId)) return fail("errors.forbidden");
  const poll = await Poll.findOne({ _id: pollId, lesson: lessonId, status: "open" });
  if (!poll) return fail("classroom.quiz.closed");
  const c = Number(choice);
  if (!Number.isInteger(c) || c < 0 || c >= poll.options.length) return fail("errors.generic");
  poll.responses = poll.responses.filter((r) => String(r.user) !== user.id);
  poll.responses.push({ user: user.id, name: user.name, choice: c });
  await poll.save();
  return { ok: true };
}

export async function closePoll(lessonId, pollId) {
  const { user } = await inRoom(lessonId, { teacherOnly: true });
  if (!user || !isId(pollId)) return fail("errors.forbidden");
  const poll = await Poll.findOneAndUpdate({ _id: pollId, lesson: lessonId }, { status: "closed" }, { new: true }).lean();
  if (!poll) return fail("errors.notFound");
  return { ok: true, data: plain(poll) };
}

/* ---------- vocabulary ---------- */

export async function addVocab(lessonId, item) {
  const { user, course } = await inRoom(lessonId, { teacherOnly: true });
  if (!user) return fail("errors.forbidden");
  const word = String(item?.word || "").trim().slice(0, 80);
  if (!word) return fail("classroom.words.wordRequired");
  const doc = await VocabItem.create({
    course: course._id,
    lesson: lessonId,
    article: ["der", "die", "das"].includes(item.article) ? item.article : "none",
    word,
    plural: String(item.plural || "").trim().slice(0, 80),
    meaning: String(item.meaning || "").trim().slice(0, 160),
    example: String(item.example || "").trim().slice(0, 300),
  });
  revalidatePath("/", "layout");
  return { ok: true, data: plain(doc) };
}

export async function deleteVocab(lessonId, id) {
  const { user, course } = await inRoom(lessonId, { teacherOnly: true });
  if (!user || !isId(id)) return fail("errors.forbidden");
  await VocabItem.deleteOne({ _id: id, course: course._id });
  revalidatePath("/", "layout");
  return { ok: true };
}

/* ---------- teacher controls ---------- */

export async function muteParticipant(lessonId, identity, trackSid) {
  const { user } = await inRoom(lessonId, { teacherOnly: true });
  if (!user || !isLiveKitConfigured()) return fail("errors.forbidden");
  try {
    await roomService().mutePublishedTrack(roomNameFor(lessonId), String(identity), String(trackSid), true);
    return done();
  } catch (err) {
    console.error("[classroom] mute", err?.message);
    return fail("errors.generic");
  }
}

export async function setParticipantCamera(lessonId, identity, trackSid, muted) {
  const { user } = await inRoom(lessonId, { teacherOnly: true });
  if (!user || !isLiveKitConfigured()) return fail("errors.forbidden");
  try {
    await roomService().mutePublishedTrack(roomNameFor(lessonId), String(identity), String(trackSid), Boolean(muted));
    return done();
  } catch (err) {
    console.error("[classroom] camera", err?.message);
    return fail("errors.generic");
  }
}

export async function removeParticipant(lessonId, identity) {
  const { user } = await inRoom(lessonId, { teacherOnly: true });
  if (!user || !isLiveKitConfigured()) return fail("errors.forbidden");
  try {
    await roomService().removeParticipant(roomNameFor(lessonId), String(identity));
    return done();
  } catch {
    return fail("errors.generic");
  }
}

export async function setScreenSharePermission(lessonId, identity, allowed) {
  const { user } = await inRoom(lessonId, { teacherOnly: true });
  if (!user || !isLiveKitConfigured()) return fail("errors.forbidden");
  try {
    await roomService().updateParticipant(roomNameFor(lessonId), String(identity), {
      permission: {
        canSubscribe: true,
        canPublish: true,
        canPublishData: true,
        canUpdateMetadata: true,
        canPublishSources: allowed ? PRESENTER_SOURCES : STUDENT_SOURCES,
      },
    });
    return done();
  } catch (err) {
    console.error("[classroom] permission", err?.message);
    return fail("errors.generic");
  }
}

export async function setRoomLocked(lessonId, locked) {
  const { user } = await inRoom(lessonId, { teacherOnly: true });
  if (!user) return fail("errors.forbidden");
  await Lesson.updateOne({ _id: lessonId }, { roomLocked: Boolean(locked) });
  return done();
}

export async function endClass(lessonId) {
  const { user } = await inRoom(lessonId, { teacherOnly: true });
  if (!user) return fail("errors.forbidden");
  await Lesson.updateOne({ _id: lessonId }, { roomLocked: false });
  try {
    if (isLiveKitConfigured()) await roomService().deleteRoom(roomNameFor(lessonId));
  } catch {
    // room may already be gone
  }
  revalidatePath("/", "layout");
  return done();
}
