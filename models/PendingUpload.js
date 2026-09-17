import mongoose from "mongoose";

/** A file upload in progress: created before the first chunk, removed once assembled. */
const PendingUploadSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    type: { type: String, required: true },
    size: { type: Number, required: true },
    received: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false },
);

// Abandoned uploads clean themselves up after two hours.
PendingUploadSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7200 });

export default mongoose.models.PendingUpload || mongoose.model("PendingUpload", PendingUploadSchema);
