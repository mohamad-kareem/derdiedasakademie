import mongoose from "mongoose";

const InquirySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, default: "" },
    level: { type: String, default: "unknown" },
    message: { type: String, default: "" },
    status: { type: String, enum: ["new", "contacted", "closed"], default: "new" },
  },
  { timestamps: true },
);

export default mongoose.models.Inquiry || mongoose.model("Inquiry", InquirySchema);
