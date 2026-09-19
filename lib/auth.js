import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import jwt from "jsonwebtoken";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { SESSION_COOKIE } from "@/lib/constants";

const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("Please add JWT_SECRET inside .env.local");
  return s;
}

export function isAdminEmail(email) {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(String(email).toLowerCase());
}

export async function createSession(user) {
  const token = jwt.sign({ id: String(user._id), role: user.role }, secret(), { expiresIn: MAX_AGE });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

// Current user (fresh from DB) or null. Cached per request.
export const getCurrentUser = cache(async () => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  let payload;
  try {
    payload = jwt.verify(token, secret());
  } catch {
    return null;
  }
  await connectDB();
  const user = await User.findById(payload.id).lean();
  if (!user || !user.isActive) return null;
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    phone: user.phone,
    avatarKey: user.avatarKey || "",
    country: user.country,
    level: user.level,
    role: user.role,
    createdAt: user.createdAt?.toISOString?.() ?? null,
  };
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireStudent() {
  const user = await requireUser();
  if (user.role === "admin") redirect("/admin");
  return user;
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/dashboard");
  return user;
}

// For server actions: return user or null without redirecting.
export async function actionUser(role) {
  const user = await getCurrentUser();
  if (!user) return null;
  if (role && user.role !== role) return null;
  return user;
}
