import mongoose from "mongoose";
import { LEVELS } from "@/lib/constants";

const CourseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    level: { type: String, enum: LEVELS, required: true },
    format: { type: String, enum: ["group", "private", "intensive"], default: "group" },
    description: { type: String, default: "" },
    schedule: { type: String, default: "" },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    price: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: "EUR" },
    capacity: { type: Number, default: 12, min: 1 },
    meetingUrl: { type: String, default: "" },
    classroom: { type: String, enum: ["builtin", "external"], default: "builtin" },
    status: { type: String, enum: ["draft", "published", "archived"], default: "draft" },
  },
  { timestamps: true },
);

CourseSchema.index({ status: 1, startDate: 1 });

export default mongoose.models.Course || mongoose.model("Course", CourseSchema);
