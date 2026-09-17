import mongoose from "mongoose";
import { AttachmentSchema } from "./attachment";

const ChatMessageSchema = new mongoose.Schema(
  {
    lesson: { type: mongoose.Schema.Types.ObjectId, ref: "Lesson", required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, default: "" },
    role: { type: String, default: "student" },
    text: { type: String, default: "" },
    attachment: { type: AttachmentSchema, default: null },
  },
  { timestamps: true },
);

export default mongoose.models.ChatMessage || mongoose.model("ChatMessage", ChatMessageSchema);
