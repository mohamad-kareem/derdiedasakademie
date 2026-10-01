"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { createSession, destroySession, isAdminEmail } from "@/lib/auth";
import { LEVELS } from "@/lib/constants";
import { str, isEmail, safeNext, fail, done } from "@/lib/validate";
import { isStaff, homeFor, normaliseRole } from "@/lib/roles";
import { getI18n } from "@/lib/i18n/server";
import { issueToken, accountForToken, clearToken } from "@/lib/tokens";
import { passwordReset, welcome } from "@/lib/letters";

export async function loginAction(formData) {
  const email = str(formData, "email", 200).toLowerCase();
  const password = String(formData.get("password") || "");
  if (!isEmail(email) || !password) return fail("errors.invalidCredentials");

  await connectDB();
  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await bcrypt.compare(password, user.password))) return fail("errors.invalidCredentials");
  if (!user.isActive && !(user.role === "student" && user.isBlocked)) return fail("errors.accountDisabled");

  // An address listed in ADMIN_EMAILS is the owner, whatever the record says.
  if (user.role !== "owner" && isAdminEmail(email)) user.role = "owner";
  user.lastLoginAt = new Date();
  await user.save();
  await createSession(user);

  if (user.role === "student" && user.isBlocked) redirect("/account-blocked");

  const fallback = homeFor(user);
  const next = safeNext(str(formData, "next"), fallback);
  redirect(isStaff(user) && next.startsWith("/dashboard") ? "/admin" : next);
}

export async function registerAction(formData) {
  const name = str(formData, "name", 80);
  const email = str(formData, "email", 200).toLowerCase();
  const phone = str(formData, "phone", 40);
  const level = str(formData, "level", 10);
  const password = String(formData.get("password") || "");
  const confirm = String(formData.get("confirm") || "");

  if (name.length < 2) return fail("errors.nameRequired");
  if (!isEmail(email)) return fail("errors.invalidEmail");
  if (password.length < 8) return fail("errors.passwordShort");
  if (password !== confirm) return fail("errors.passwordMismatch");

  await connectDB();
  if (await User.exists({ email })) return fail("errors.emailTaken");

  const { locale } = await getI18n();
  const user = await User.create({
    name,
    email,
    phone,
    locale,
    level: LEVELS.includes(level) ? level : "unknown",
    password: await bcrypt.hash(password, 12),
    role: isAdminEmail(email) ? "owner" : "student",
    lastLoginAt: new Date(),
  });
  await createSession(user);
  if (!isStaff(user)) await welcome(user);

  redirect(isStaff(user) ? "/admin" : safeNext(str(formData, "next"), "/dashboard"));
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}

/* ------------------------------------------------------- forgotten passwords */

/**
 * Ask for a link.
 *
 * The answer is the same whether or not the address is known here. Telling a
 * stranger which of the addresses they typed belongs to a real student would
 * be handing out the roll of the school.
 */
export async function requestPasswordReset(formData) {
  const email = str(formData, "email", 200).toLowerCase();
  if (!isEmail(email)) return fail("errors.invalidEmail");

  await connectDB();
  const user = await User.findOne({ email }).select("name email role isActive locale").lean();
  if (user && user.isActive) {
    const token = await issueToken(user._id);
    await passwordReset(user, token);
  }
  return done("auth.reset.sent");
}

/** Whether a link is still good — asked by the page before it draws the form. */
export async function checkResetToken(token) {
  await connectDB();
  const user = await accountForToken(token);
  return user ? { ok: true, name: user.name, email: user.email } : fail("auth.reset.badLink");
}

/**
 * Spend the link and set the password.
 *
 * Signing the person straight in afterwards is deliberate: they have just
 * proved they hold the address, which is the same proof a login asks for, and
 * sending them back to a login form to type what they typed a second ago is a
 * small insult.
 */
export async function setPasswordWithToken(token, formData) {
  const password = String(formData.get("password") || "");
  const confirm = String(formData.get("confirm") || "");
  if (password.length < 8) return fail("errors.passwordShort");
  if (password !== confirm) return fail("errors.passwordMismatch");

  await connectDB();
  const found = await accountForToken(token);
  if (!found) return fail("auth.reset.badLink");

  await User.updateOne({ _id: found._id }, { password: await bcrypt.hash(password, 12), lastLoginAt: new Date() });
  await clearToken(found._id);

  const user = await User.findById(found._id).lean();
  const who = { ...user, role: normaliseRole(user.role) };
  await createSession(who);
  redirect(homeFor(who));
}
