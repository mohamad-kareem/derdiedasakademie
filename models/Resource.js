import mongoose from "mongoose";
import { AttachmentSchema } from "./attachment";
import { RESOURCE_CATEGORIES } from "@/lib/constants";

export { RESOURCE_CATEGORIES };

const ResourceSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true, index: true },
    lesson: { type: mongoose.Schema.Types.ObjectId, ref: "Lesson", default: null },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    category: { type: String, enum: RESOURCE_CATEGORIES, default: "other" },
    attachments: [AttachmentSchema],
    url: { type: String, default: "" },
    visible: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export default mongoose.models.Resource || mongoose.model("Resource", ResourceSchema);
