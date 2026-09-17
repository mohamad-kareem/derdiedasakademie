"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { createSession, destroySession, isAdminEmail } from "@/lib/auth";
import { LEVELS } from "@/lib/constants";
import { str, isEmail, safeNext, fail } from "@/lib/validate";

export async function loginAction(formData) {
  const email = str(formData, "email", 200).toLowerCase();
  const password = String(formData.get("password") || "");
  if (!isEmail(email) || !password) return fail("errors.invalidCredentials");

  await connectDB();
  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await bcrypt.compare(password, user.password))) return fail("errors.invalidCredentials");
  if (!user.isActive) return fail("errors.accountDisabled");

  if (user.role !== "admin" && isAdminEmail(email)) user.role = "admin";
  user.lastLoginAt = new Date();
  await user.save();
  await createSession(user);

  const fallback = user.role === "admin" ? "/admin" : "/dashboard";
  const next = safeNext(str(formData, "next"), fallback);
  redirect(user.role === "admin" && next.startsWith("/dashboard") ? "/admin" : next);
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

  const user = await User.create({
    name,
    email,
    phone,
    level: LEVELS.includes(level) ? level : "unknown",
    password: await bcrypt.hash(password, 12),
    role: isAdminEmail(email) ? "admin" : "student",
    lastLoginAt: new Date(),
  });
  await createSession(user);

  redirect(user.role === "admin" ? "/admin" : safeNext(str(formData, "next"), "/dashboard"));
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}
