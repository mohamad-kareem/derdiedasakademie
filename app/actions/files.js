"use server";

import connectDB from "@/lib/mongodb";
import { actionUser } from "@/lib/auth";
import { canUseCourse } from "@/lib/access";
import { isStaff, teaches } from "@/lib/roles";
import Course from "@/models/Course";
import { isId } from "@/lib/validate";
import { allowedType, buildKey, isStorageConfigured, MAX_UPLOAD_MB, UPLOAD_CHUNK_BYTES } from "@/lib/storage";
import PendingUpload from "@/models/PendingUpload";

const ADMIN_SCOPES = ["materials", "assignments", "resources", "announcements", "chat", "feedback"];

const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];
const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

/**
 * Checks permission and reserves a storage key. The browser then sends the file
 * to /api/files/upload in chunks, using the returned uploadId.
 * scope: materials | assignments | resources | announcements | chat | submission | feedback
 */
export async function createUpload({ scope, courseId, studentId, name, size }) {
  const user = await actionUser();
  if (!user) return { ok: false, error: "errors.loginRequired" };
  if (!isStorageConfigured()) return { ok: false, error: "files.notConfigured" };

  const type = allowedType(name);
  if (!type) return { ok: false, error: "files.typeNotAllowed" };
  if (!Number.isFinite(size) || size <= 0 || size > MAX_UPLOAD_MB * 1024 * 1024) return { ok: false, error: "files.tooLarge" };

  await connectDB();

  // A portrait belongs to the person, not to a course, so it is settled first
  // and on its own terms: pictures only, and a small allowance.
  if (scope === "avatar") {
    if (!AVATAR_TYPES.includes(type)) return { ok: false, error: "profile.photoType" };
    if (size > AVATAR_MAX_BYTES) return { ok: false, error: "profile.photoTooLarge" };
    const key = buildKey(`avatars/${user.id}`, name);
    const pending = await PendingUpload.create({ key, user: user.id, name, type, size });
    return { ok: true, key, type, uploadId: String(pending._id), chunkSize: UPLOAD_CHUNK_BYTES };
  }

  if (!isId(courseId)) return { ok: false, error: "errors.forbidden" };
  let prefix;
  if (isStaff(user)) {
    // Materials go into a course the person actually runs.
    const course = await Course.findById(courseId).select("teacher").lean();
    if (course && teaches(user, course)) {
      if (scope === "feedback" && isId(studentId)) prefix = `submissions/${courseId}/${studentId}/feedback`;
      else if (ADMIN_SCOPES.includes(scope)) prefix = `courses/${courseId}/${scope}`;
    }
  } else if (scope === "submission" && (await canUseCourse(user, courseId))) {
    prefix = `submissions/${courseId}/${user.id}`;
  } else if (scope === "chat" && (await canUseCourse(user, courseId, { activeOnly: true }))) {
    prefix = `courses/${courseId}/chat`;
  }
  if (!prefix) return { ok: false, error: "errors.forbidden" };

  const key = buildKey(prefix, name);
  const pending = await PendingUpload.create({ key, user: user.id, name, type, size });
  return { ok: true, key, type, uploadId: String(pending._id), chunkSize: UPLOAD_CHUNK_BYTES };
}
