import mongoose from "mongoose";

export function str(formData, name, max = 5000) {
  const v = formData.get(name);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

export function num(formData, name, fallback = 0) {
  const n = Number(formData.get(name));
  return Number.isFinite(n) ? n : fallback;
}

export function isEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
}

export function isId(id) {
  return typeof id === "string" && mongoose.isValidObjectId(id);
}

export function safeNext(next, fallback) {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}

export const fail = (error) => ({ ok: false, error });
export const done = (message) => ({ ok: true, message });
