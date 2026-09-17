import mongoose from "mongoose";

const AssignmentSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true, index: true },
    title: { type: String, required: true, trim: true },
    instructions: { type: String, default: "" },
    resourceUrl: { type: String, default: "" },
    dueDate: { type: Date },
    maxPoints: { type: Number, default: 100 },
  },
  { timestamps: true },
);

export default mongoose.models.Assignment || mongoose.model("Assignment", AssignmentSchema);
