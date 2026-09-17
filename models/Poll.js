import mongoose from "mongoose";

const PollSchema = new mongoose.Schema(
  {
    lesson: { type: mongoose.Schema.Types.ObjectId, ref: "Lesson", required: true, index: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    question: { type: String, required: true },
    options: [{ type: String }],
    correctIndex: { type: Number, default: -1 },
    status: { type: String, enum: ["open", "closed"], default: "open" },
    responses: [
      {
        _id: false,
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        name: String,
        choice: Number,
        at: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);

export default mongoose.models.Poll || mongoose.model("Poll", PollSchema);
