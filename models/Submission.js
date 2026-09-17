import mongoose from "mongoose";
import { AttachmentSchema } from "./attachment";

const SubmissionSchema = new mongoose.Schema(
  {
    assignment: { type: mongoose.Schema.Types.ObjectId, ref: "Assignment", required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, default: "" },
    linkUrl: { type: String, default: "" },
    attachments: [AttachmentSchema],
    feedbackAttachments: [AttachmentSchema],
    status: { type: String, enum: ["submitted", "graded"], default: "submitted" },
    grade: { type: Number },
    feedback: { type: String, default: "" },
    gradedAt: Date,
  },
  { timestamps: true },
);

SubmissionSchema.index({ assignment: 1, student: 1 }, { unique: true });
SubmissionSchema.index({ status: 1, createdAt: -1 });

export default mongoose.models.Submission || mongoose.model("Submission", SubmissionSchema);
