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
import { LEVELS } from "@/lib/constants";
import { str, num, isId, isEmail, fail, done } from "@/lib/validate";
import { parseLocalDateTime, safeUrl } from "@/lib/utils";

async function guard() {
  const admin = await actionUser("admin");
  if (!admin) return null;
  await connectDB();
  return admin;
}

function refresh() {
  revalidatePath("/", "layout");
}

/* ---------------- Courses ---------------- */

export async function saveCourse(courseId, formData) {
  if (!(await guard())) return fail("errors.forbidden");

  const title = str(formData, "title", 120);
  const level = str(formData, "level", 4);
  const startDate = parseLocalDateTime(str(formData, "startDate"));
  const endDate = parseLocalDateTime(str(formData, "endDate"));
  if (!title) return fail("errors.titleRequired");
  if (!LEVELS.includes(level)) return fail("errors.levelRequired");
  if (!startDate || !endDate) return fail("errors.datesRequired");
  if (endDate < startDate) return fail("errors.datesOrder");

  const data = {
    title,
    level,
    format: ["group", "private", "intensive"].includes(str(formData, "format")) ? str(formData, "format") : "group",
    description: str(formData, "description", 5000),
    schedule: str(formData, "schedule", 200),
    startDate,
    endDate,
    price: Math.max(0, num(formData, "price")),
    currency: (str(formData, "currency", 3) || "EUR").toUpperCase(),
    capacity: Math.max(1, Math.round(num(formData, "capacity", 12))),
    meetingUrl: safeUrl(str(formData, "meetingUrl", 500)),
    status: ["draft", "published", "archived"].includes(str(formData, "status")) ? str(formData, "status") : "draft",
  };

  if (courseId) {
    if (!isId(courseId)) return fail("errors.notFound");
    await Course.updateOne({ _id: courseId }, data);
    refresh();
    return done("admin.saved");
  }
  const course = await Course.create(data);
  refresh();
  redirect(`/admin/courses/${course._id}`);
}

export async function deleteCourse(courseId) {
  if (!(await guard()) || !isId(courseId)) return fail("errors.forbidden");
  if (await Enrollment.exists({ course: courseId, status: { $in: ["active", "completed", "pending"] } })) {
    return fail("errors.courseHasStudents");
  }
  await Promise.all([
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
  if (!(await guard()) || !isId(courseId)) return fail("errors.forbidden");
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
    recordingUrl: safeUrl(str(formData, "recordingUrl", 500)),
    materials: parseMaterials(formData.get("materials")),
  };
  if (lessonId) {
    if (!isId(lessonId)) return fail("errors.notFound");
    await Lesson.updateOne({ _id: lessonId, course: courseId }, data);
  } else {
    await Lesson.create(data);
  }
  refresh();
  return done("admin.saved");
}

export async function deleteLesson(lessonId) {
  if (!(await guard()) || !isId(lessonId)) return fail("errors.forbidden");
  await Lesson.deleteOne({ _id: lessonId });
  refresh();
  return done();
}

/* ---------------- Assignments ---------------- */

export async function saveAssignment(courseId, assignmentId, formData) {
  if (!(await guard()) || !isId(courseId)) return fail("errors.forbidden");
  const title = str(formData, "title", 160);
  if (!title) return fail("errors.titleRequired");
  const data = {
    course: courseId,
    title,
    instructions: str(formData, "instructions", 10000),
    resourceUrl: safeUrl(str(formData, "resourceUrl", 500)),
    dueDate: parseLocalDateTime(str(formData, "dueDate")) || undefined,
    maxPoints: Math.max(1, Math.round(num(formData, "maxPoints", 100))),
  };
  if (assignmentId) {
    if (!isId(assignmentId)) return fail("errors.notFound");
    await Assignment.updateOne({ _id: assignmentId, course: courseId }, data);
  } else {
    await Assignment.create(data);
  }
  refresh();
  return done("admin.saved");
}

export async function deleteAssignment(assignmentId) {
  if (!(await guard()) || !isId(assignmentId)) return fail("errors.forbidden");
  await Submission.deleteMany({ assignment: assignmentId });
  await Assignment.deleteOne({ _id: assignmentId });
  refresh();
  return done();
}

export async function gradeSubmission(submissionId, formData) {
  if (!(await guard()) || !isId(submissionId)) return fail("errors.forbidden");
  const sub = await Submission.findById(submissionId).populate("assignment", "maxPoints");
  if (!sub) return fail("errors.notFound");
  const grade = num(formData, "grade", NaN);
  const max = sub.assignment?.maxPoints ?? 100;
  if (!Number.isFinite(grade) || grade < 0 || grade > max) return fail("errors.gradeRange");
  sub.grade = grade;
  sub.feedback = str(formData, "feedback", 5000);
  sub.status = "graded";
  sub.gradedAt = new Date();
  await sub.save();
  refresh();
  return done("admin.graded");
}

export async function reopenSubmission(submissionId) {
  if (!(await guard()) || !isId(submissionId)) return fail("errors.forbidden");
  await Submission.updateOne({ _id: submissionId }, { status: "submitted" });
  refresh();
  return done();
}

/* ---------------- Announcements ---------------- */

export async function saveAnnouncement(announcementId, formData) {
  if (!(await guard())) return fail("errors.forbidden");
  const title = str(formData, "title", 160);
  if (!title) return fail("errors.titleRequired");
  const course = str(formData, "course");
  const data = {
    title,
    body: str(formData, "body", 5000),
    pinned: formData.get("pinned") === "on",
    course: isId(course) ? course : null,
  };
  if (announcementId) {
    if (!isId(announcementId)) return fail("errors.notFound");
    await Announcement.updateOne({ _id: announcementId }, data);
  } else {
    await Announcement.create(data);
  }
  refresh();
  return done("admin.saved");
}

export async function deleteAnnouncement(id) {
  if (!(await guard()) || !isId(id)) return fail("errors.forbidden");
  await Announcement.deleteOne({ _id: id });
  refresh();
  return done();
}

/* ---------------- Enrollments ---------------- */

export async function setEnrollmentStatus(enrollmentId, status) {
  if (!(await guard()) || !isId(enrollmentId)) return fail("errors.forbidden");
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
  if (!(await guard()) || !isId(enrollmentId)) return fail("errors.forbidden");
  if (!["paid", "unpaid"].includes(paymentStatus)) return fail("errors.generic");
  await Enrollment.updateOne({ _id: enrollmentId }, { paymentStatus });
  refresh();
  return done();
}

export async function addStudentToCourse(courseId, formData) {
  if (!(await guard()) || !isId(courseId)) return fail("errors.forbidden");
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
  if (!(await guard()) || !isId(studentId)) return fail("errors.forbidden");
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

/* ---------------- Inquiries ---------------- */

export async function setInquiryStatus(id, status) {
  if (!(await guard()) || !isId(id)) return fail("errors.forbidden");
  if (!["new", "contacted", "closed"].includes(status)) return fail("errors.generic");
  await Inquiry.updateOne({ _id: id }, { status });
  refresh();
  return done();
}

export async function deleteInquiry(id) {
  if (!(await guard()) || !isId(id)) return fail("errors.forbidden");
  await Inquiry.deleteOne({ _id: id });
  refresh();
  return done();
}
