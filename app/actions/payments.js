"use server";

import { revalidatePath } from "next/cache";
import { actionUser } from "@/lib/auth";
import { isOwner } from "@/lib/roles";
import { str, isId, fail, done } from "@/lib/validate";
import User from "@/models/User";
import Enrollment from "@/models/Enrollment";

export async function saveBankAccount(formData) {
  const user = await actionUser("staff");
  if (!isOwner(user)) return fail("errors.forbidden");
  const data = {
    bankAccountHolder: str(formData, "bankAccountHolder", 120),
    bankName: str(formData, "bankName", 120),
    bankIban: str(formData, "bankIban", 80).replace(/\s/g, "").toUpperCase(),
    bankAccountNumber: str(formData, "bankAccountNumber", 60),
    bankSwift: str(formData, "bankSwift", 30).replace(/\s/g, "").toUpperCase(),
    bankCurrency: str(formData, "bankCurrency", 10).trim().toUpperCase(),
  };
  if (Object.values(data).some(Boolean)) {
    if (!data.bankAccountHolder || !data.bankName || !(data.bankIban || data.bankAccountNumber) || !/^[A-Z]{3}$/.test(data.bankCurrency)) return fail("bank.incomplete");
    if (data.bankIban && !/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(data.bankIban)) return fail("bank.invalidIban");
    if (data.bankSwift && !/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(data.bankSwift)) return fail("bank.invalidSwift");
  }
  await User.updateOne({ _id: user.id }, data);
  revalidatePath("/", "layout");
  return done("bank.saved");
}

export async function setStudentPaymentMethod(enrollmentId, formData) {
  const user = await actionUser("student");
  if (!user || !isId(enrollmentId)) return fail("errors.forbidden");
  const paymentMethod = str(formData, "paymentMethod", 30);
  if (!["whish", "bank"].includes(paymentMethod)) return fail("whish.invalidMethod");
  const result = await Enrollment.updateOne({
    _id: enrollmentId, student: user.id, paymentStatus: { $in: ["unpaid", "partial"] },
    status: { $in: ["pending", "active", "completed"] }, amount: { $gt: 0 },
  }, { paymentMethod });
  if (!result.matchedCount) return fail("errors.forbidden");
  revalidatePath("/", "layout");
  return done("bank.methodSaved");
}
