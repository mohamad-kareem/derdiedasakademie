"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import connectDB from "@/lib/mongodb";
import { actionUser } from "@/lib/auth";
import User from "@/models/User";
import Course from "@/models/Course";
import Enrollment from "@/models/Enrollment";
import Assignment from "@/models/Assignment";
import Submission from "@/models/Submission";
import { LEVELS } from "@/lib/constants";
import { str, isId, fail, done } from "@/lib/validate";
import { safeUrl } from "@/lib/utils";
import { parseAttachments, removedKeys } from "@/lib/access";
import { deleteKeys } from "@/lib/storage";

function refresh() {
  revalidatePath("/", "layout");
}

export async function requestEnrollment(courseId, formData) {
  const user = await actionUser("student");
  if (!user) return fail("errors.loginRequired");
  if (!isId(courseId)) return fail("errors.notFound");

  await connectDB();
  const course = await Course.findOne({ _id: courseId, status: "published" }).lean();
  if (!course) return fail("errors.notFound");

  const taken = await Enrollment.countDocuments({ course: courseId, status: { $in: ["active", "pending"] } });
  if (taken >= course.capacity) return fail("errors.courseFull");

  const existing = await Enrollment.findOne({ student: user.id, course: courseId });
  if (existing && ["pending", "active", "completed"].includes(existing.status)) return fail("errors.alreadyEnrolled");

  const data = {
    status: "pending",
    paymentStatus: "unpaid",
    amount: course.price,
    message: str(formData, "message", 1000),
  };
  if (existing) {
    Object.assign(existing, data);
    await existing.save();
  } else {
    await Enrollment.create({ student: user.id, course: courseId, ...data });
  }
  refresh();
  return done("enroll.requested");
}

export async function cancelEnrollment(enrollmentId) {
  const user = await actionUser("student");
  if (!user || !isId(enrollmentId)) return fail("errors.generic");
  await connectDB();
  const res = await Enrollment.updateOne(
    { _id: enrollmentId, student: user.id, status: "pending" },
    { status: "cancelled" },
  );
  if (!res.modifiedCount) return fail("errors.generic");
  refresh();
  return done();
}

export async function submitAssignment(assignmentId, formData) {
  const user = await actionUser("student");
  if (!user || !isId(assignmentId)) return fail("errors.generic");
  const text = str(formData, "text", 20000);
  const linkUrl = safeUrl(str(formData, "linkUrl", 1000));

  await connectDB();
  const assignment = await Assignment.findById(assignmentId).lean();
  if (!assignment) return fail("errors.notFound");
  const attachments = parseAttachments(formData, "attachments", `submissions/${assignment.course}/${user.id}/`, 10).filter(
    (a) => !a.key.includes("/feedback"),
  );
  if (!text && !linkUrl && !attachments.length) return fail("errors.submissionEmpty");
  const enrolled = await Enrollment.exists({
    student: user.id,
    course: assignment.course,
    status: { $in: ["active", "completed"] },
  });
  if (!enrolled) return fail("errors.forbidden");

  const existing = await Submission.findOne({ assignment: assignmentId, student: user.id });
  if (existing?.status === "graded") return fail("errors.alreadyGraded");

  if (existing) {
    await deleteKeys(removedKeys(existing.attachments, attachments));
    existing.text = text;
    existing.linkUrl = linkUrl;
    existing.attachments = attachments;
    await existing.save();
  } else {
    await Submission.create({ assignment: assignmentId, course: assignment.course, student: user.id, text, linkUrl, attachments });
  }
  refresh();
  return done("assignments.submitted");
}

export async function updateProfile(formData) {
  const user = await actionUser();
  if (!user) return fail("errors.loginRequired");
  const name = str(formData, "name", 80);
  if (name.length < 2) return fail("errors.nameRequired");
  const level = str(formData, "level", 10);

  await connectDB();
  const update = { name, phone: str(formData, "phone", 40), country: str(formData, "country", 60) };
  if (user.role === "student" && (LEVELS.includes(level) || level === "unknown")) update.level = level;
  await User.updateOne({ _id: user.id }, update);
  refresh();
  return done("profile.saved");
}

export async function changePassword(formData) {
  const user = await actionUser();
  if (!user) return fail("errors.loginRequired");
  const current = String(formData.get("current") || "");
  const next = String(formData.get("password") || "");
  const confirm = String(formData.get("confirm") || "");
  if (next.length < 8) return fail("errors.passwordShort");
  if (next !== confirm) return fail("errors.passwordMismatch");

  await connectDB();
  const doc = await User.findById(user.id).select("+password");
  if (!(await bcrypt.compare(current, doc.password))) return fail("errors.wrongPassword");
  doc.password = await bcrypt.hash(next, 12);
  await doc.save();
  return done("profile.passwordChanged");
}

/**
 * Sets the signed-in person's portrait to a file they have just uploaded under
 * their own avatars/ prefix, and removes whatever portrait it replaces so the
 * database does not accumulate discarded pictures.
 */
export async function setAvatar(key) {
  const user = await actionUser();
  if (!user) return fail("errors.loginRequired");
  if (typeof key !== "string" || !key.startsWith(`avatars/${user.id}/`) || key.includes("..")) {
    return fail("errors.forbidden");
  }

  await connectDB();
  const doc = await User.findById(user.id).select("avatarKey");
  if (!doc) return fail("errors.forbidden");
  const previous = doc.avatarKey;
  doc.avatarKey = key;
  await doc.save();
  if (previous && previous !== key) await deleteKeys([previous]);
  refresh();
  return done("profile.photoSaved");
}

export async function clearAvatar() {
  const user = await actionUser();
  if (!user) return fail("errors.loginRequired");

  await connectDB();
  const doc = await User.findById(user.id).select("avatarKey");
  if (!doc) return fail("errors.forbidden");
  const previous = doc.avatarKey;
  doc.avatarKey = "";
  await doc.save();
  if (previous) await deleteKeys([previous]);
  refresh();
  return done("profile.photoRemoved");
}
