"use server";

import connectDB from "@/lib/mongodb";
import Inquiry from "@/models/Inquiry";
import { revalidatePath } from "next/cache";
import { str, isEmail, fail, done } from "@/lib/validate";

export async function submitInquiry(formData) {
  if (str(formData, "company")) return done("contact.sent"); // honeypot
  const name = str(formData, "name", 80);
  const email = str(formData, "email", 200).toLowerCase();
  if (name.length < 2) return fail("errors.nameRequired");
  if (!isEmail(email)) return fail("errors.invalidEmail");

  await connectDB();
  await Inquiry.create({
    name,
    email,
    phone: str(formData, "phone", 40),
    level: str(formData, "level", 10) || "unknown",
    message: str(formData, "message", 2000),
  });
  revalidatePath("/admin", "layout");
  return done("contact.sent");
}
