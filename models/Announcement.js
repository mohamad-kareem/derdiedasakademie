import mongoose from "mongoose";

const AnnouncementSchema = new mongoose.Schema(
  {
    // null course = visible to every student
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", default: null, index: true },
    title: { type: String, required: true, trim: true },
    body: { type: String, default: "" },
    pinned: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export default mongoose.models.Announcement || mongoose.model("Announcement", AnnouncementSchema);
