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
    // Written by the course's weekly pattern rather than typed by hand. It is
    // only a note of where the date came from: once a session exists nothing
    // moves or removes it automatically.
    auto: { type: Boolean, default: false },
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
    // When the "you have a class" letters went out, so they go out once.
    remindedAt: { type: Date, default: null },
    endedAt: Date,
  },
  { timestamps: true },
);

// One class per course per instant. The weekly pattern tops the calendar up
// whenever somebody opens the timetable, so two people looking at once must
// not be able to write the same session twice.
LessonSchema.index({ course: 1, startsAt: 1 }, { unique: true });

export default mongoose.models.Lesson || mongoose.model("Lesson", LessonSchema);
