"use server";

import { revalidatePath } from "next/cache";
import connectDB from "@/lib/mongodb";
import { actionUser } from "@/lib/auth";
import { classroomAccess } from "@/lib/classroom";
import { roomService, roomNameFor, createClassToken, isLiveKitConfigured, PRESENTER_SOURCES, STUDENT_SOURCES } from "@/lib/livekit";
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

/* ---------- break-out groups ---------- */

/**
 * Break-out groups work like Zoom's or Webex's: the class splits into separate
 * rooms, each with its own video, whiteboard and chat, and comes back together
 * on the teacher's word.
 *
 * The split is recorded on the lesson rather than only announced, so that a
 * student whose browser reloads lands back in their own group; and the call to
 * come back is sent by the server into every group room, because by then the
 * teacher is only in one of them.
 */

const encoder = new TextEncoder();

/** Sends one of our ordinary bus messages into a room, from the server. */
async function tell(room, type, payload = {}) {
  const body = encoder.encode(JSON.stringify({ type, payload }));
  await roomService().sendData(room, body, 0, { topic: "ddd" });
}

/** A token for the room this person belongs in — the main one, or their group. */
export async function joinRoom(lessonId, group = 0) {
  const { user, lesson, isTeacher } = await inRoom(lessonId);
  if (!user || !lesson || !isLiveKitConfigured()) return fail("errors.forbidden");

  const n = Math.max(0, Math.min(20, Math.round(Number(group) || 0)));

  // A student may only enter the group they were put in; the teacher goes anywhere.
  if (!isTeacher && n > 0) {
    const mine = (lesson.breakout?.assignments || []).find((a) => String(a.user) === user.id);
    if (!lesson.breakout?.active || !mine || mine.group !== n) return fail("errors.forbidden");
  }

  const token = await createClassToken({ user, lessonId, isTeacher, group: n });
  return { ok: true, token, group: n };
}

/**
 * Splits the class. `assignments` is a plain map of user id to group number,
 * decided in the browser where the teacher can see who is present.
 */
export async function startBreakouts(lessonId, assignments) {
  const { user, isTeacher } = await inRoom(lessonId, { teacherOnly: true });
  if (!user || !isTeacher || !isLiveKitConfigured()) return fail("errors.forbidden");
  if (!assignments || typeof assignments !== "object") return fail("errors.generic");

  const clean = [];
  let groups = 0;
  for (const [id, raw] of Object.entries(assignments)) {
    const group = Math.round(Number(raw) || 0);
    if (!isId(id) || group < 1 || group > 20) continue;
    clean.push({ user: id, group });
    groups = Math.max(groups, group);
  }
  if (!clean.length) return fail("errors.generic");

  await Lesson.updateOne(
    { _id: lessonId },
    { breakout: { active: true, groups, startedAt: new Date(), assignments: clean } },
  );
  await tell(roomNameFor(lessonId), "breakout:start", {
    groups,
    assignments: Object.fromEntries(clean.map((a) => [String(a.user), a.group])),
  });
  return done();
}

/** Brings everyone back to the main room. */
export async function endBreakouts(lessonId) {
  const { user, lesson, isTeacher } = await inRoom(lessonId, { teacherOnly: true });
  if (!user || !isTeacher || !isLiveKitConfigured()) return fail("errors.forbidden");

  const groups = lesson?.breakout?.groups || 0;
  await Lesson.updateOne({ _id: lessonId }, { "breakout.active": false });
  await Promise.all(
    Array.from({ length: groups }, (_, i) => tell(roomNameFor(lessonId, i + 1), "breakout:end", {}).catch(() => {})),
  );
  return done();
}

/** A line from the teacher, delivered into every group at once. */
export async function messageBreakouts(lessonId, text) {
  const { user, lesson, isTeacher } = await inRoom(lessonId, { teacherOnly: true });
  if (!user || !isTeacher || !isLiveKitConfigured()) return fail("errors.forbidden");
  const clean = String(text || "").trim().slice(0, 500);
  if (!clean) return fail("errors.generic");

  const groups = lesson?.breakout?.groups || 0;
  await Promise.all(
    Array.from({ length: groups }, (_, i) =>
      tell(roomNameFor(lessonId, i + 1), "breakout:note", { text: clean, from: user.name }).catch(() => {}),
    ),
  );
  return done();
}

/** Who is in which group right now, for the teacher's panel. */
export async function breakoutPresence(lessonId) {
  const { user, lesson, isTeacher } = await inRoom(lessonId, { teacherOnly: true });
  if (!user || !isTeacher || !isLiveKitConfigured()) return { ok: false, rooms: [] };
  const groups = lesson?.breakout?.groups || 0;
  const svc = roomService();
  const rooms = await Promise.all(
    Array.from({ length: groups }, async (_, i) => {
      try {
        const people = await svc.listParticipants(roomNameFor(lessonId, i + 1));
        return { group: i + 1, people: people.map((p) => ({ identity: p.identity, name: p.name })) };
      } catch {
        return { group: i + 1, people: [] };
      }
    }),
  );
  return { ok: true, rooms };
}
