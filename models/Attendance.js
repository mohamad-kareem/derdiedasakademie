import mongoose from "mongoose";

const AttendanceSchema = new mongoose.Schema(
  {
    lesson: { type: mongoose.Schema.Types.ObjectId, ref: "Lesson", required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    firstJoinedAt: { type: Date, default: Date.now },
    lastSeenAt: { type: Date, default: Date.now },
    seconds: { type: Number, default: 0 },
  },
  { timestamps: true },
);

AttendanceSchema.index({ lesson: 1, user: 1 }, { unique: true });

export default mongoose.models.Attendance || mongoose.model("Attendance", AttendanceSchema);
