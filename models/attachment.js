import mongoose from "mongoose";

export const AttachmentSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    name: { type: String, required: true },
    size: { type: Number, default: 0 },
    type: { type: String, default: "" },
  },
  { _id: false },
);
