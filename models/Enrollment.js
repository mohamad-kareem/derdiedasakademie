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
    paymentStatus: { type: String, enum: ["unpaid", "partial", "paid"], default: "unpaid" },
    paidAmount: { type: Number, default: 0, min: 0 },
    paymentDueDate: { type: String, default: "" },
    paymentMethod: { type: String, enum: ["", "whish", "bank"], default: "" },
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
