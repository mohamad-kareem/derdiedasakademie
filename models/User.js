import mongoose from "mongoose";
import { LEVELS } from "@/lib/constants";
import { ROLES, LEGACY_OWNER } from "@/lib/roles";

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    phone: { type: String, default: "", trim: true },
    avatarKey: { type: String, default: "" },
    whishNumber: { type: String, default: "", trim: true, maxlength: 30 },
    whishQrKey: { type: String, default: "" },
    bankAccountHolder: { type: String, default: "", trim: true, maxlength: 120 },
    bankName: { type: String, default: "", trim: true, maxlength: 120 },
    bankIban: { type: String, default: "", trim: true, maxlength: 34 },
    bankAccountNumber: { type: String, default: "", trim: true, maxlength: 60 },
    bankSwift: { type: String, default: "", trim: true, maxlength: 11 },
    bankCurrency: { type: String, default: "", trim: true, maxlength: 3 },
    country: { type: String, default: "", trim: true },
    level: { type: String, enum: [...LEVELS, "unknown"], default: "unknown" },
    // "admin" is the value the single-owner version wrote; it is read as "owner".
    role: { type: String, enum: [...ROLES, LEGACY_OWNER], default: "student" },
    title: { type: String, default: "", trim: true, maxlength: 80 },
    isActive: { type: Boolean, default: true },
    isBlocked: { type: Boolean, default: false },
    blockReason: { type: String, default: "", maxlength: 1000 },
    adminNote: { type: String, default: "" },
    // The language this person reads. Set when they sign up and whenever they
    // change it, so a letter arrives in the language they chose rather than in
    // whatever the person who triggered it happens to be using.
    locale: { type: String, enum: ["en", "de", "ar"], default: "en" },
    // A single-use ticket for setting a password: only its hash is kept, so a
    // leaked database still cannot be used to take over an account.
    resetTokenHash: { type: String, default: "", select: false },
    resetExpires: { type: Date, select: false },
    lastLoginAt: { type: Date },
  },
  { timestamps: true },
);

export default mongoose.models.User || mongoose.model("User", UserSchema);
