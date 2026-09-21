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
    // Break-out groups. `assignments` maps a person to a group number (1..n);
    // it is kept on the lesson so that reloading a page puts someone back in
    // the group they were in rather than the main room.
    breakout: {
      active: { type: Boolean, default: false },
      groups: { type: Number, default: 0 },
      startedAt: Date,
      assignments: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, group: Number, _id: false }],
    },
    endedAt: Date,
  },
  { timestamps: true },
);

export default mongoose.models.Lesson || mongoose.model("Lesson", LessonSchema);
