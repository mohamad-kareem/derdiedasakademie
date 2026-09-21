/**
 * Who may do what.
 *
 * Three roles. The **owner** runs the academy: money, enrolments, accounts and
 * the system itself are theirs alone. A **teacher** is staff too, and sees the
 * whole teaching side of the school, but never a price, a payment or another
 * person's account settings. A **student** has no business here at all.
 *
 * Two questions are asked separately and should not be confused:
 *
 *   can(user, "courses.create")   — may this person do this kind of thing?
 *   teaches(user, course)         — may they do it to *this* course?
 *
 * A teacher passes the first for teaching work and the second only for the
 * courses assigned to them. Every guard in the system is one or both of these.
 */

export const ROLES = ["owner", "teacher", "student"];

/** The old single-admin model wrote "admin"; it means owner. */
export const LEGACY_OWNER = "admin";
export function normaliseRole(role) {
  return role === LEGACY_OWNER ? "owner" : role;
}

export const isOwner = (user) => user?.role === "owner";
export const isTeacher = (user) => user?.role === "teacher";
export const isStaff = (user) => user?.role === "owner" || user?.role === "teacher";
export const isStudent = (user) => user?.role === "student";

/** Where a person lands after signing in. */
export const homeFor = (user) => (isStaff(user) ? "/admin" : "/dashboard");

/**
 * Capabilities, granted by role. Anything not listed is denied, so a new
 * capability is invisible until it is deliberately given to someone.
 */
const GRANTS = {
  owner: [
    "courses.view",
    "courses.create",
    "courses.editAny",
    "courses.delete",
    "courses.assign",
    "teaching.manage",
    "grading.manage",
    "announcements.manage",
    "resources.manage",
    "students.view",
    "students.manage",
    "enrollments.view",
    "enrollments.decide",
    "finance.view",
    "finance.manage",
    "inquiries.manage",
    "staff.manage",
    "usage.view",
    "system.settings",
  ],
  teacher: [
    "courses.view",
    "teaching.manage",
    "grading.manage",
    "announcements.manage",
    "resources.manage",
    "students.view",
    "enrollments.view",
  ],
  student: [],
};

const SETS = Object.fromEntries(Object.entries(GRANTS).map(([role, list]) => [role, new Set(list)]));

export function can(user, capability) {
  if (!user) return false;
  return Boolean(SETS[normaliseRole(user.role)]?.has(capability));
}

/**
 * Whether this person is responsible for this course — the owner always is,
 * a teacher only for the courses assigned to them. `course` may be a document,
 * a lean object or just the teacher id.
 */
export function teaches(user, course) {
  if (!user) return false;
  if (isOwner(user) || normaliseRole(user.role) === "owner") return true;
  if (!isTeacher(user) || !course) return false;
  const assigned = course.teacher ?? course;
  return Boolean(assigned) && String(assigned?._id || assigned) === String(user.id);
}

/**
 * The filter that limits a query to the courses a person is responsible for.
 * The owner gets everything; a teacher gets their own; anyone else, nothing.
 */
export function ownCoursesFilter(user) {
  if (isOwner(user) || normaliseRole(user?.role) === "owner") return {};
  if (isTeacher(user)) return { teacher: user.id };
  return { _id: null };
}

/** The name of the portal as this person should see it. */
export function portalKey(user) {
  return isOwner(user) || normaliseRole(user?.role) === "owner" ? "admin.portal" : "admin.teacherPortal";
}
