import mongoose from "mongoose";

const UploadChunkSchema = new mongoose.Schema(
  {
    upload: { type: mongoose.Schema.Types.ObjectId, ref: "PendingUpload", required: true, index: true },
    index: { type: Number, required: true },
    data: { type: Buffer, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false },
);

UploadChunkSchema.index({ upload: 1, index: 1 }, { unique: true });
UploadChunkSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7200 });

export default mongoose.models.UploadChunk || mongoose.model("UploadChunk", UploadChunkSchema);
