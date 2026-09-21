"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import connectDB from "@/lib/mongodb";
import { actionUser } from "@/lib/auth";
import User from "@/models/User";
import Course from "@/models/Course";
import Enrollment from "@/models/Enrollment";
import Lesson from "@/models/Lesson";
import Assignment from "@/models/Assignment";
import Submission from "@/models/Submission";
import Announcement from "@/models/Announcement";
import Inquiry from "@/models/Inquiry";
import Resource from "@/models/Resource";
import Attendance from "@/models/Attendance";
import ChatMessage from "@/models/ChatMessage";
import Poll from "@/models/Poll";
import VocabItem from "@/models/VocabItem";
import { parseAttachments, removedKeys } from "@/lib/access";
import { deleteKeys } from "@/lib/storage";
import { LEVELS, RESOURCE_CATEGORIES } from "@/lib/constants";
import { str, num, isId, isEmail, fail, done } from "@/lib/validate";
import { parseLocalDateTime, safeUrl } from "@/lib/utils";
import { can, teaches, isOwner, ROLES } from "@/lib/roles";

/**
 * Every action starts here. `capability` says what kind of thing is being
 * attempted; the caller then checks, where it matters, that the person is
 * responsible for the particular course involved.
 */
async function guard(capability) {
  const user = await actionUser("staff");
  if (!user || !can(user, capability)) return null;
  await connectDB();
  return user;
}

/** The staff member, but only if the course this record belongs to is theirs. */
async function guardOwned(capability, Model, id) {
  const user = await guard(capability);
  if (!user || !isId(String(id))) return null;
  const doc = await Model.findById(id).select("course").lean();
  if (!doc) return null;
  const course = await Course.findById(doc.course).select("teacher").lean();
  if (!course || !teaches(user, course)) return null;
  return user;
}

/**
 * An announcement without a course goes to the whole academy, which only the
 * owner may do; one attached to a course belongs to whoever runs it.
 */
async function guardAnnouncement(id, courseId) {
  const user = await guard("announcements.manage");
  if (!user) return null;

  const allowed = async (course) => {
    if (!course) return isOwner(user);
    const doc = await Course.findById(course).select("teacher").lean();
    return Boolean(doc) && teaches(user, doc);
  };

  // Editing: the notice must be theirs both where it is and where it is going,
  // so it cannot be moved into a colleague's course.
  if (id) {
    if (!isId(String(id))) return null;
    const ann = await Announcement.findById(id).select("course").lean();
    if (!ann || !(await allowed(ann.course))) return null;
  }
  return (await allowed(courseId)) ? user : null;
}

/** The staff member, but only if this course is theirs to work on. */
async function guardCourse(capability, courseId) {
  const user = await guard(capability);
  if (!user || !isId(String(courseId))) return null;
  const course = await Course.findById(courseId).select("teacher").lean();
  if (!course || !teaches(user, course)) return null;
  return user;
}

function refresh() {
  revalidatePath("/", "layout");
}

/* ---------------- Courses ---------------- */

export async function saveCourse(courseId, formData) {
  const user = await actionUser("staff");
  if (!user) return fail("errors.forbidden");
  await connectDB();

  // Who may touch this at all: the owner may create and edit anything, a
  // teacher may edit a course that has been assigned to them, and nobody else.
  const owner = isOwner(user);
  if (!courseId && !can(user, "courses.create")) return fail("errors.forbidden");
  let existing = null;
  if (courseId) {
    if (!isId(courseId)) return fail("errors.notFound");
    existing = await Course.findById(courseId).select("teacher").lean();
    if (!existing || !teaches(user, existing)) return fail("errors.forbidden");
  }

  const title = str(formData, "title", 120);
  const level = str(formData, "level", 4);
  const startDate = parseLocalDateTime(str(formData, "startDate"));
  const endDate = parseLocalDateTime(str(formData, "endDate"));

  // What may be changed: a teacher edits how the course runs, never what it
  // costs, how many seats it has, whether it is published, or who teaches it.
  const teaching = {
    description: str(formData, "description", 5000),
    schedule: str(formData, "schedule", 200),
    meetingUrl: safeUrl(str(formData, "meetingUrl", 500)),
    classroom: str(formData, "classroom") === "external" ? "external" : "builtin",
    studentCameras: str(formData, "studentCameras") === "on" ? "on" : "off",
  };

  if (!owner) {
    await Course.updateOne({ _id: courseId }, teaching);
    refresh();
    return done("admin.saved");
  }

  if (!title) return fail("errors.titleRequired");
  if (!LEVELS.includes(level)) return fail("errors.levelRequired");
  if (!startDate || !endDate) return fail("errors.datesRequired");
  if (endDate < startDate) return fail("errors.datesOrder");

  const assigned = str(formData, "teacher");
  const data = {
    ...teaching,
    title,
    level,
    format: ["group", "private", "intensive"].includes(str(formData, "format")) ? str(formData, "format") : "group",
    startDate,
    endDate,
    price: Math.max(0, num(formData, "price")),
    currency: (str(formData, "currency", 3) || "EUR").toUpperCase(),
    capacity: Math.max(1, Math.round(num(formData, "capacity", 12))),
    status: ["draft", "published", "archived"].includes(str(formData, "status")) ? str(formData, "status") : "draft",
    teacher: isId(assigned) ? assigned : null,
  };

  // Only a member of staff can be put in charge of a course.
  if (data.teacher) {
    const staff = await User.exists({ _id: data.teacher, role: { $in: ["owner", "teacher", "admin"] } });
    if (!staff) data.teacher = null;
  }

  if (courseId) {
    await Course.updateOne({ _id: courseId }, data);
    refresh();
    return done("admin.saved");
  }
  const course = await Course.create(data);
  refresh();
  redirect(`/admin/courses/${course._id}`);
}

export async function deleteCourse(courseId) {
  if (!(await guard("courses.delete")) || !isId(courseId)) return fail("errors.forbidden");
  if (await Enrollment.exists({ course: courseId, status: { $in: ["active", "completed", "pending"] } })) {
    return fail("errors.courseHasStudents");
  }
  const keysOf = (docs, field = "attachments") => docs.flatMap((d) => (d[field] || []).map((a) => a.key));
  const [lessonDocs, assignmentDocs, subDocs, annDocs, resDocs, chatDocs] = await Promise.all([
    Lesson.find({ course: courseId }).select("attachments").lean(),
    Assignment.find({ course: courseId }).select("attachments").lean(),
    Submission.find({ course: courseId }).select("attachments feedbackAttachments").lean(),
    Announcement.find({ course: courseId }).select("attachments").lean(),
    Resource.find({ course: courseId }).select("attachments").lean(),
    ChatMessage.find({ lesson: { $in: (await Lesson.find({ course: courseId }).select("_id").lean()).map((l) => l._id) }, attachment: { $ne: null } }).select("attachment").lean(),
  ]);
  await deleteKeys([
    ...keysOf(lessonDocs), ...keysOf(assignmentDocs), ...keysOf(subDocs), ...keysOf(subDocs, "feedbackAttachments"),
    ...keysOf(annDocs), ...keysOf(resDocs), ...chatDocs.map((c) => c.attachment?.key),
  ]);
  const lessonIds = lessonDocs.map((l) => l._id);
  await Promise.all([
    Resource.deleteMany({ course: courseId }),
    Attendance.deleteMany({ course: courseId }),
    Poll.deleteMany({ course: courseId }),
    VocabItem.deleteMany({ course: courseId }),
    ChatMessage.deleteMany({ lesson: { $in: lessonIds } }),
    Lesson.deleteMany({ course: courseId }),
    Assignment.deleteMany({ course: courseId }),
    Submission.deleteMany({ course: courseId }),
    Announcement.deleteMany({ course: courseId }),
    Enrollment.deleteMany({ course: courseId }),
  ]);
  await Course.deleteOne({ _id: courseId });
  refresh();
  redirect("/admin/courses");
}

/* ---------------- Lessons / sessions ---------------- */

function parseMaterials(raw) {
  return String(raw || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [a, b] = line.split("|").map((s) => s.trim());
      return b ? { title: a, url: safeUrl(b) } : { title: a.replace(/^https?:\/\//, "").slice(0, 60), url: safeUrl(a) };
    })
    .slice(0, 30);
}

export async function saveLesson(courseId, lessonId, formData) {
  if (!(await guardCourse("teaching.manage", courseId))) return fail("errors.forbidden");
  const title = str(formData, "title", 160);
  const startsAt = parseLocalDateTime(str(formData, "startsAt"));
  if (!title) return fail("errors.titleRequired");
  if (!startsAt) return fail("errors.datesRequired");

  const data = {
    course: courseId,
    title,
    description: str(formData, "description", 3000),
    startsAt,
    durationMin: Math.max(15, Math.round(num(formData, "durationMin", 90))),
    meetingUrl: safeUrl(str(formData, "meetingUrl", 500)),
    materials: parseMaterials(formData.get("materials")),
    attachments: parseAttachments(formData, "attachments", `courses/${courseId}/`),
  };
  if (lessonId) {
    if (!isId(lessonId)) return fail("errors.notFound");
    const before = await Lesson.findOne({ _id: lessonId, course: courseId }).select("attachments").lean();
    if (!before) return fail("errors.notFound");
    await Lesson.updateOne({ _id: lessonId, course: courseId }, data);
    await deleteKeys(removedKeys(before.attachments, data.attachments));
  } else {
    await Lesson.create(data);
  }
  refresh();
  return done("admin.saved");
}

export async function deleteLesson(lessonId) {
  if (!(await guardOwned("teaching.manage", Lesson, lessonId))) return fail("errors.forbidden");
  const lesson = await Lesson.findById(lessonId).select("attachments").lean();
  if (!lesson) return fail("errors.notFound");
  const chats = await ChatMessage.find({ lesson: lessonId, attachment: { $ne: null } }).select("attachment").lean();
  await deleteKeys([...(lesson.attachments || []).map((a) => a.key), ...chats.map((c) => c.attachment?.key)]);
  await Promise.all([
    Attendance.deleteMany({ lesson: lessonId }),
    Poll.deleteMany({ lesson: lessonId }),
    ChatMessage.deleteMany({ lesson: lessonId }),
    VocabItem.updateMany({ lesson: lessonId }, { lesson: null }),
    Assignment.updateMany({ lesson: lessonId }, { lesson: null }),
    Resource.updateMany({ lesson: lessonId }, { lesson: null }),
  ]);
  await Lesson.deleteOne({ _id: lessonId });
  refresh();
  return done();
}

/* ---------------- Assignments ---------------- */

export async function saveAssignment(courseId, assignmentId, formData) {
  if (!(await guardCourse("teaching.manage", courseId))) return fail("errors.forbidden");
  const title = str(formData, "title", 160);
  if (!title) return fail("errors.titleRequired");
  const data = {
    course: courseId,
    title,
    instructions: str(formData, "instructions", 10000),
    resourceUrl: safeUrl(str(formData, "resourceUrl", 500)),
    dueDate: parseLocalDateTime(str(formData, "dueDate")) || undefined,
    maxPoints: Math.max(1, Math.round(num(formData, "maxPoints", 100))),
    attachments: parseAttachments(formData, "attachments", `courses/${courseId}/`),
    lesson: isId(str(formData, "lesson")) ? str(formData, "lesson") : null,
  };
  if (assignmentId) {
    if (!isId(assignmentId)) return fail("errors.notFound");
    const before = await Assignment.findOne({ _id: assignmentId, course: courseId }).select("attachments").lean();
    if (!before) return fail("errors.notFound");
    await Assignment.updateOne({ _id: assignmentId, course: courseId }, data);
    await deleteKeys(removedKeys(before.attachments, data.attachments));
  } else {
    await Assignment.create(data);
  }
  refresh();
  return done("admin.saved");
}

export async function deleteAssignment(assignmentId) {
  if (!(await guardOwned("teaching.manage", Assignment, assignmentId))) return fail("errors.forbidden");
  const [assignment, subs] = await Promise.all([
    Assignment.findById(assignmentId).select("attachments").lean(),
    Submission.find({ assignment: assignmentId }).select("attachments feedbackAttachments").lean(),
  ]);
  await deleteKeys([
    ...(assignment?.attachments || []).map((a) => a.key),
    ...subs.flatMap((s) => [...(s.attachments || []), ...(s.feedbackAttachments || [])].map((a) => a.key)),
  ]);
  await Submission.deleteMany({ assignment: assignmentId });
  await Assignment.deleteOne({ _id: assignmentId });
  refresh();
  return done();
}

export async function gradeSubmission(submissionId, formData) {
  if (!(await guardOwned("grading.manage", Submission, submissionId))) return fail("errors.forbidden");
  const sub = await Submission.findById(submissionId).populate("assignment", "maxPoints");
  if (!sub) return fail("errors.notFound");
  const grade = num(formData, "grade", NaN);
  const max = sub.assignment?.maxPoints ?? 100;
  if (!Number.isFinite(grade) || grade < 0 || grade > max) return fail("errors.gradeRange");
  sub.grade = grade;
  sub.feedback = str(formData, "feedback", 5000);
  const feedbackFiles = parseAttachments(formData, "feedbackAttachments", `submissions/${sub.course}/${sub.student}/feedback`);
  await deleteKeys(removedKeys(sub.feedbackAttachments, feedbackFiles));
  sub.feedbackAttachments = feedbackFiles;
  sub.status = "graded";
  sub.gradedAt = new Date();
  await sub.save();
  refresh();
  return done("admin.graded");
}

export async function reopenSubmission(submissionId) {
  if (!(await guardOwned("grading.manage", Submission, submissionId))) return fail("errors.forbidden");
  await Submission.updateOne({ _id: submissionId }, { status: "submitted" });
  refresh();
  return done();
}

/* ---------------- Announcements ---------------- */

export async function saveAnnouncement(announcementId, formData) {
  const course = str(formData, "course");
  const target = isId(course) ? course : null;
  if (!(await guardAnnouncement(announcementId || null, target))) return fail("errors.forbidden");
  const title = str(formData, "title", 160);
  if (!title) return fail("errors.titleRequired");
  const data = {
    title,
    body: str(formData, "body", 5000),
    pinned: formData.get("pinned") === "on",
    course: target,
  };
  data.attachments = data.course ? parseAttachments(formData, "attachments", `courses/${data.course}/`) : [];
  if (announcementId) {
    if (!isId(announcementId)) return fail("errors.notFound");
    const before = await Announcement.findById(announcementId).select("attachments").lean();
    await Announcement.updateOne({ _id: announcementId }, data);
    await deleteKeys(removedKeys(before?.attachments, data.attachments));
  } else {
    await Announcement.create(data);
  }
  refresh();
  return done("admin.saved");
}

export async function deleteAnnouncement(id) {
  if (!(await guardAnnouncement(id))) return fail("errors.forbidden");
  const ann = await Announcement.findById(id).select("attachments").lean();
  await deleteKeys((ann?.attachments || []).map((a) => a.key));
  await Announcement.deleteOne({ _id: id });
  refresh();
  return done();
}

/* ---------------- Enrollments ---------------- */

export async function setEnrollmentStatus(enrollmentId, status) {
  if (!(await guard("enrollments.decide")) || !isId(enrollmentId)) return fail("errors.forbidden");
  if (!["pending", "active", "completed", "rejected", "cancelled"].includes(status)) return fail("errors.generic");
  const enrollment = await Enrollment.findById(enrollmentId).populate("course", "capacity");
  if (!enrollment) return fail("errors.notFound");

  if (status === "active" && enrollment.status !== "active" && enrollment.status !== "completed") {
    const taken = await Enrollment.countDocuments({ course: enrollment.course._id, status: "active" });
    if (taken >= enrollment.course.capacity) return fail("errors.courseFull");
  }
  enrollment.status = status;
  if (status === "active" && !enrollment.approvedAt) enrollment.approvedAt = new Date();
  if (status === "completed") enrollment.completedAt = new Date();
  if (status !== "completed") enrollment.completedAt = undefined;
  await enrollment.save();
  refresh();
  return done();
}

export async function setPaymentStatus(enrollmentId, paymentStatus) {
  if (!(await guard("finance.manage")) || !isId(enrollmentId)) return fail("errors.forbidden");
  if (!["paid", "unpaid"].includes(paymentStatus)) return fail("errors.generic");
  await Enrollment.updateOne({ _id: enrollmentId }, { paymentStatus });
  refresh();
  return done();
}

export async function addStudentToCourse(courseId, formData) {
  if (!(await guard("enrollments.decide")) || !isId(courseId)) return fail("errors.forbidden");
  const email = str(formData, "email", 200).toLowerCase();
  if (!isEmail(email)) return fail("errors.invalidEmail");
  const [student, course] = await Promise.all([
    User.findOne({ email, role: "student" }).lean(),
    Course.findById(courseId).lean(),
  ]);
  if (!student) return fail("errors.studentNotFound");
  if (!course) return fail("errors.notFound");
  const taken = await Enrollment.countDocuments({ course: courseId, status: "active" });
  if (taken >= course.capacity) return fail("errors.courseFull");

  await Enrollment.findOneAndUpdate(
    { student: student._id, course: courseId },
    {
      status: "active",
      approvedAt: new Date(),
      amount: course.price,
      paymentStatus: formData.get("paid") === "on" ? "paid" : "unpaid",
    },
    { upsert: true, setDefaultsOnInsert: true },
  );
  refresh();
  return done("admin.studentAdded");
}

/* ---------------- Students ---------------- */

export async function updateStudent(studentId, formData) {
  if (!(await guard("students.manage")) || !isId(studentId)) return fail("errors.forbidden");
  const level = str(formData, "level", 10);
  const update = {
    name: str(formData, "name", 80),
    phone: str(formData, "phone", 40),
    adminNote: str(formData, "adminNote", 3000),
    isActive: formData.get("isActive") === "on",
  };
  if (update.name.length < 2) return fail("errors.nameRequired");
  if (LEVELS.includes(level) || level === "unknown") update.level = level;
  const newPassword = String(formData.get("newPassword") || "");
  if (newPassword) {
    if (newPassword.length < 8) return fail("errors.passwordShort");
    update.password = await bcrypt.hash(newPassword, 12);
  }
  await User.updateOne({ _id: studentId, role: "student" }, update);
  refresh();
  return done("admin.saved");
}

/* ---------------- Course library ---------------- */

export async function saveResource(courseId, resourceId, formData) {
  if (!(await guardCourse("resources.manage", courseId))) return fail("errors.forbidden");
  const title = str(formData, "title", 160);
  if (!title) return fail("errors.titleRequired");
  const category = str(formData, "category");
  const data = {
    course: courseId,
    title,
    description: str(formData, "description", 3000),
    category: RESOURCE_CATEGORIES.includes(category) ? category : "other",
    url: safeUrl(str(formData, "url", 500)),
    lesson: isId(str(formData, "lesson")) ? str(formData, "lesson") : null,
    visible: formData.get("visible") === "on",
    attachments: parseAttachments(formData, "attachments", `courses/${courseId}/`),
  };
  if (!data.url && !data.attachments.length) return fail("errors.resourceEmpty");
  if (resourceId) {
    if (!isId(resourceId)) return fail("errors.notFound");
    const before = await Resource.findOne({ _id: resourceId, course: courseId }).select("attachments").lean();
    if (!before) return fail("errors.notFound");
    await Resource.updateOne({ _id: resourceId }, data);
    await deleteKeys(removedKeys(before.attachments, data.attachments));
  } else {
    await Resource.create(data);
  }
  refresh();
  return done("admin.saved");
}

export async function deleteResource(resourceId) {
  if (!(await guardOwned("resources.manage", Resource, resourceId))) return fail("errors.forbidden");
  const r = await Resource.findById(resourceId).select("attachments").lean();
  await deleteKeys((r?.attachments || []).map((a) => a.key));
  await Resource.deleteOne({ _id: resourceId });
  refresh();
  return done();
}

/* ---------------- Inquiries ---------------- */

export async function setInquiryStatus(id, status) {
  if (!(await guard("inquiries.manage")) || !isId(id)) return fail("errors.forbidden");
  if (!["new", "contacted", "closed"].includes(status)) return fail("errors.generic");
  await Inquiry.updateOne({ _id: id }, { status });
  refresh();
  return done();
}

export async function deleteInquiry(id) {
  if (!(await guard("inquiries.manage")) || !isId(id)) return fail("errors.forbidden");
  await Inquiry.deleteOne({ _id: id });
  refresh();
  return done();
}

/* ---------------- Staff ---------------- */

/**
 * Creates a colleague's account or edits one. Only the owner may do this, and
 * the owner's own account is not editable from here — that is what their own
 * profile page is for, and it keeps the last owner from locking themselves out.
 */
export async function saveStaff(staffId, formData) {
  const actor = await guard("staff.manage");
  if (!actor) return fail("errors.forbidden");

  const name = str(formData, "name", 80);
  const email = str(formData, "email", 200).toLowerCase();
  const role = str(formData, "role", 10) === "owner" ? "owner" : "teacher";
  if (name.length < 2) return fail("errors.nameRequired");
  if (!isEmail(email)) return fail("errors.invalidEmail");

  const data = { name, email, role, title: str(formData, "title", 80), phone: str(formData, "phone", 40) };

  if (staffId) {
    if (!isId(staffId)) return fail("errors.notFound");
    if (String(staffId) === actor.id) return fail("errors.forbidden");
    const clash = await User.exists({ email, _id: { $ne: staffId } });
    if (clash) return fail("errors.emailTaken");
    const doc = await User.findById(staffId).select("role").lean();
    if (!doc || doc.role === "student") return fail("errors.notFound");
    await User.updateOne({ _id: staffId }, data);
    refresh();
    return done("admin.saved");
  }

  if (await User.exists({ email })) return fail("errors.emailTaken");
  const password = String(formData.get("password") || "");
  if (password.length < 8) return fail("errors.passwordShort");
  await User.create({ ...data, password: await bcrypt.hash(password, 12), level: "unknown" });
  refresh();
  return done("admin.staff.created");
}

/** Suspends or restores a colleague. A suspended account cannot sign in. */
export async function setStaffActive(staffId, active) {
  const actor = await guard("staff.manage");
  if (!actor || !isId(staffId)) return fail("errors.forbidden");
  if (String(staffId) === actor.id) return fail("errors.forbidden");
  const doc = await User.findById(staffId).select("role").lean();
  if (!doc || doc.role === "student") return fail("errors.notFound");
  await User.updateOne({ _id: staffId }, { isActive: Boolean(active) });
  refresh();
  return done("admin.saved");
}

/**
 * Removes a colleague's account. Their courses are not deleted — they are left
 * unassigned, so the owner can hand them to someone else.
 */
export async function deleteStaff(staffId) {
  const actor = await guard("staff.manage");
  if (!actor || !isId(staffId)) return fail("errors.forbidden");
  if (String(staffId) === actor.id) return fail("errors.forbidden");
  const doc = await User.findById(staffId).select("role avatarKey").lean();
  if (!doc || doc.role === "student") return fail("errors.notFound");
  if (doc.role === "owner" && (await User.countDocuments({ role: { $in: ["owner", "admin"] } })) <= 1) {
    return fail("errors.forbidden");
  }
  await Course.updateMany({ teacher: staffId }, { teacher: null });
  if (doc.avatarKey) await deleteKeys([doc.avatarKey]);
  await User.deleteOne({ _id: staffId });
  refresh();
  return done();
}
