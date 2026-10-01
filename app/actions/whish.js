"use server";

import { revalidatePath } from "next/cache";
import { actionUser } from "@/lib/auth";
import { isOwner } from "@/lib/roles";
import { str, fail, done } from "@/lib/validate";
import { parseAttachments } from "@/lib/access";
import { findFile } from "@/lib/storage";
import User from "@/models/User";

export async function saveWhishAccount(formData) {
  const user = await actionUser("staff");
  if (!isOwner(user)) return fail("errors.forbidden");
  const whishNumber = str(formData, "whishNumber", 100);
  if (whishNumber && !/^\+?[\d ()-]{6,30}$/.test(whishNumber)) return fail("whish.invalidNumber");
  const files = parseAttachments(formData, "whishQr", `payments/${user.id}/`, 1);
  let raw;
  try { raw = JSON.parse(formData.get("whishQr") || "[]"); } catch { return fail("whish.invalidQr"); }
  if (!Array.isArray(raw) || raw.length > 1 || raw.length !== files.length) return fail("whish.invalidQr");
  const whishQrKey = files[0]?.key || "";
  if (whishQrKey) {
    const file = await findFile(whishQrKey);
    const type = file?.contentType || file?.metadata?.type;
    if (!file || !["image/png", "image/jpeg", "image/webp"].includes(type) || file.length > 5 * 1024 * 1024) return fail("whish.invalidQr");
  }
  await User.updateOne({ _id: user.id }, { whishNumber, whishQrKey });
  revalidatePath("/", "layout");
  return done("whish.accountSaved");
}
