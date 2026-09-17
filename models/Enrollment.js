import mongoose from "mongoose";

const EnrollmentSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    status: {
      type: String,
      enum: ["pending", "active", "completed", "rejected", "cancelled"],
      default: "pending",
    },
    paymentStatus: { type: String, enum: ["unpaid", "paid"], default: "unpaid" },
    amount: { type: Number, default: 0 },
    message: { type: String, default: "" },
    adminNote: { type: String, default: "" },
    approvedAt: Date,
    completedAt: Date,
  },
  { timestamps: true },
);

EnrollmentSchema.index({ student: 1, course: 1 }, { unique: true });
EnrollmentSchema.index({ course: 1, status: 1 });

export default mongoose.models.Enrollment || mongoose.model("Enrollment", EnrollmentSchema);
