import Enrollment from "@/models/Enrollment";
import { isId } from "@/lib/validate";

/** Student may use course content (active or completed enrollment). Admin always. */
export async function canUseCourse(user, courseId, { activeOnly = false } = {}) {
  if (!user || !isId(String(courseId))) return false;
  if (user.role === "admin") return true;
  const statuses = activeOnly ? ["active"] : ["active", "completed"];
  return Boolean(await Enrollment.exists({ student: user.id, course: courseId, status: { $in: statuses } }));
}

/**
 * Storage keys encode who may read them:
 *   courses/{courseId}/...                      → anyone enrolled in the course
 *   submissions/{courseId}/{studentId}/...      → that student (and admins)
 *   avatars/{userId}/...                        → any signed-in member of the academy
 */
export async function canReadKey(user, key) {
  if (!user || typeof key !== "string" || key.includes("..")) return false;
  if (user.role === "admin") return true;
  const parts = key.split("/");
  // Portraits are shown beside names all over the portal, so any signed-in
  // person may load one; the caller is already authenticated at this point.
  if (parts[0] === "avatars") return true;
  if (parts[0] === "courses") return canUseCourse(user, parts[1]);
  if (parts[0] === "submissions") return parts[2] === user.id && canUseCourse(user, parts[1]);
  return false;
}

/** Parse an attachments JSON field and keep only files under an allowed prefix. */
export function parseAttachments(formData, field, prefix, max = 20) {
  let list = [];
  try {
    list = JSON.parse(formData.get(field) || "[]");
  } catch {
    return [];
  }
  if (!Array.isArray(list)) return [];
  return list
    .filter((f) => f && typeof f.key === "string" && f.key.startsWith(prefix) && !f.key.includes(".."))
    .slice(0, max)
    .map((f) => ({
      key: f.key,
      name: String(f.name || "file").slice(0, 160),
      size: Number(f.size) || 0,
      type: String(f.type || "").slice(0, 120),
    }));
}

export function removedKeys(before = [], after = []) {
  const keep = new Set(after.map((a) => a.key));
  return before.map((a) => a.key).filter((k) => !keep.has(k));
}
