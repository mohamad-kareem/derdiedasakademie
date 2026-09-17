import mongoose from "mongoose";
import { LEVELS } from "@/lib/constants";

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    phone: { type: String, default: "", trim: true },
    country: { type: String, default: "", trim: true },
    level: { type: String, enum: [...LEVELS, "unknown"], default: "unknown" },
    role: { type: String, enum: ["admin", "student"], default: "student" },
    isActive: { type: Boolean, default: true },
    adminNote: { type: String, default: "" },
    lastLoginAt: { type: Date },
  },
  { timestamps: true },
);

export default mongoose.models.User || mongoose.model("User", UserSchema);
