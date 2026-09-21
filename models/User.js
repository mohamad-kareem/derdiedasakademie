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
    country: { type: String, default: "", trim: true },
    level: { type: String, enum: [...LEVELS, "unknown"], default: "unknown" },
    // "admin" is the value the single-owner version wrote; it is read as "owner".
    role: { type: String, enum: [...ROLES, LEGACY_OWNER], default: "student" },
    title: { type: String, default: "", trim: true, maxlength: 80 },
    isActive: { type: Boolean, default: true },
    adminNote: { type: String, default: "" },
    lastLoginAt: { type: Date },
  },
  { timestamps: true },
);

export default mongoose.models.User || mongoose.model("User", UserSchema);
