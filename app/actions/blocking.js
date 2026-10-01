"use server";

import { revalidatePath } from "next/cache";
import { actionUser } from "@/lib/auth";
import { isOwner } from "@/lib/roles";
import { isId, str, fail, done } from "@/lib/validate";
import User from "@/models/User";

export async function setStudentBlock(studentId, formData) {
  const owner = await actionUser("staff");
  if (!isOwner(owner) || !isId(studentId)) return fail("errors.forbidden");
  const mode = str(formData, "mode", 20);
  if (!["block", "unblock"].includes(mode)) return fail("errors.generic");
  const blockReason = mode === "block" ? str(formData, "blockReason", 1000) : "";
  if (mode === "block" && !blockReason) return fail("blocking.reasonRequired");
  const result = await User.updateOne({ _id: studentId, role: "student" }, { isBlocked: mode === "block", blockReason });
  if (!result.matchedCount) return fail("errors.notFound");
  revalidatePath("/", "layout");
  return done(mode === "block" ? "blocking.saved" : "blocking.unblocked");
}
