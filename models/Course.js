import mongoose from "mongoose";
import { LEVELS } from "@/lib/constants";

const CourseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    level: { type: String, enum: LEVELS, required: true },
    format: { type: String, enum: ["group", "private", "intensive"], default: "group" },
    description: { type: String, default: "" },
    // The old free-text line ("Mon & Wed · 18:00–19:30"). Kept so that courses
    // written before the timetable existed still read correctly; `meetings`
    // replaces it the moment a real pattern is set.
    schedule: { type: String, default: "" },
    /**
     * When the course meets, week after week. `day` is 0 for Monday through 6
     * for Sunday and `start` is minutes past midnight in academy time, which
     * is what makes a Tuesday at 18:00 mean the same thing in Beirut and Bonn
     * and survive the clocks going back.
     */
    meetings: [{ day: { type: Number, min: 0, max: 6 }, start: { type: Number, min: 0, max: 1439 }, _id: false }],
    sessionMin: { type: Number, default: 90, min: 15, max: 600 },
    // How far ahead the sessions are written into the calendar. The whole term
    // at once is unreadable, so only the next few weeks exist at any moment
    // and the rest appear as the course goes on. 0 turns that off entirely.
    weeksAhead: { type: Number, default: 3, min: 0, max: 12 },
    filledUntil: Date,
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    price: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: "EUR" },
    capacity: { type: Number, default: 12, min: 1 },
    meetingUrl: { type: String, default: "" },
    classroom: { type: String, enum: ["builtin", "external"], default: "builtin" },
    studentCameras: { type: String, enum: ["on", "off"], default: "off" },
    status: { type: String, enum: ["draft", "published", "archived"], default: "draft" },
    // The member of staff who runs this course. Null means the owner does.
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

CourseSchema.index({ status: 1, startDate: 1 });
CourseSchema.index({ teacher: 1, startDate: -1 });

export default mongoose.models.Course || mongoose.model("Course", CourseSchema);
