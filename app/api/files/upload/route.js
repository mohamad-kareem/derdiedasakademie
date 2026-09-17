import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import PendingUpload from "@/models/PendingUpload";
import UploadChunk from "@/models/UploadChunk";
import { MAX_UPLOAD_MB, UPLOAD_CHUNK_BYTES, writeFile } from "@/lib/storage";
import { isId } from "@/lib/validate";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/files/upload?uploadId=…&index=0     → store one chunk (raw body)
 * POST /api/files/upload?uploadId=…&finish=1    → assemble the chunks into the final file
 */
export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const uploadId = params.get("uploadId") || "";
  if (!isId(uploadId)) return NextResponse.json({ message: "Bad request" }, { status: 400 });

  await connectDB();
  const pending = await PendingUpload.findById(uploadId);
  if (!pending || String(pending.user) !== user.id) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  if (params.get("finish") === "1") {
    const chunks = await UploadChunk.find({ upload: pending._id }).sort({ index: 1 }).select("data").lean();
    if (!chunks.length) return NextResponse.json({ message: "No data" }, { status: 400 });
    try {
      await writeFile({
        key: pending.key,
        name: pending.name,
        type: pending.type,
        chunks: chunks.map((c) => (Buffer.isBuffer(c.data) ? c.data : Buffer.from(c.data.buffer || c.data))),
      });
    } catch (err) {
      console.error("[upload] assemble failed", err?.message);
      return NextResponse.json({ message: "Storage error" }, { status: 500 });
    }
    await Promise.all([UploadChunk.deleteMany({ upload: pending._id }), PendingUpload.deleteOne({ _id: pending._id })]);
    return NextResponse.json({ ok: true, key: pending.key });
  }

  const index = Number(params.get("index"));
  if (!Number.isInteger(index) || index < 0 || index > 1000) return NextResponse.json({ message: "Bad request" }, { status: 400 });

  const body = Buffer.from(await request.arrayBuffer());
  if (!body.length || body.length > UPLOAD_CHUNK_BYTES + 1024) return NextResponse.json({ message: "Bad chunk" }, { status: 400 });
  if (pending.received + body.length > MAX_UPLOAD_MB * 1024 * 1024) {
    await Promise.all([UploadChunk.deleteMany({ upload: pending._id }), PendingUpload.deleteOne({ _id: pending._id })]);
    return NextResponse.json({ message: "Too large" }, { status: 413 });
  }

  await UploadChunk.updateOne({ upload: pending._id, index }, { $set: { data: body, createdAt: new Date() } }, { upsert: true });
  pending.received += body.length;
  await pending.save();
  return NextResponse.json({ ok: true, received: pending.received });
}
