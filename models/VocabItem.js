import mongoose from "mongoose";

const VocabItemSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true, index: true },
    lesson: { type: mongoose.Schema.Types.ObjectId, ref: "Lesson", default: null },
    article: { type: String, enum: ["der", "die", "das", "none"], default: "none" },
    word: { type: String, required: true, trim: true },
    plural: { type: String, default: "" },
    meaning: { type: String, default: "" },
    example: { type: String, default: "" },
  },
  { timestamps: true },
);

export default mongoose.models.VocabItem || mongoose.model("VocabItem", VocabItemSchema);
