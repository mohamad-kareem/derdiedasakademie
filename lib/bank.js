import "server-only";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

export async function getBankAccount() {
  await connectDB();
  const owner = await User.findOne({ role: { $in: ["owner", "admin"] }, isActive: true,
    bankAccountHolder: { $gt: "" }, bankName: { $gt: "" }, bankCurrency: { $gt: "" },
    $or: [{ bankIban: { $gt: "" } }, { bankAccountNumber: { $gt: "" } }],
  }).sort({ createdAt: 1 }).select("bankAccountHolder bankName bankIban bankAccountNumber bankSwift bankCurrency").lean();
  if (!owner) return null;
  return Object.fromEntries(["bankAccountHolder", "bankName", "bankIban", "bankAccountNumber", "bankSwift", "bankCurrency"].map((key) => [key, owner[key] || ""]));
}
