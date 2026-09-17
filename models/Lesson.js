import mongoose from "mongoose";
import { AttachmentSchema } from "./attachment";

const LessonSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    startsAt: { type: Date, required: true },
    durationMin: { type: Number, default: 90 },
    meetingUrl: { type: String, default: "" },
    materials: [{ title: String, url: String }],
    attachments: [AttachmentSchema],
    roomLocked: { type: Boolean, default: false },
    endedAt: Date,
  },
  { timestamps: true },
);

export default mongoose.models.Lesson || mongoose.model("Lesson", LessonSchema);
