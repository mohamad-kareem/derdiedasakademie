import mongoose from "mongoose";

const LessonSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    startsAt: { type: Date, required: true },
    durationMin: { type: Number, default: 90 },
    meetingUrl: { type: String, default: "" },
    recordingUrl: { type: String, default: "" },
    materials: [{ title: String, url: String }],
  },
  { timestamps: true },
);

export default mongoose.models.Lesson || mongoose.model("Lesson", LessonSchema);
