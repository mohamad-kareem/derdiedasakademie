import mongoose from "mongoose";
import crypto from "crypto";
import connectDB from "@/lib/mongodb";

/**
 * Files are stored inside MongoDB itself (GridFS) — no external storage account needed.
 * Uploads travel through our own API in small chunks so they also work on serverless hosts
 * such as Vercel, which limit a single request body to ~4.5 MB.
 */

export const MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_MB || 25);
export const UPLOAD_CHUNK_BYTES = 3 * 1024 * 1024;
export const BUCKET_NAME = "uploads";

const TYPES = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  odt: "application/vnd.oasis.opendocument.text",
  txt: "text/plain",
  csv: "text/csv",
  rtf: "application/rtf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  heic: "image/heic",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  wav: "audio/wav",
  ogg: "audio/ogg",
  oga: "audio/ogg",
  weba: "audio/webm",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  zip: "application/zip",
};

/** Storage always works as long as the database is configured. */
export function isStorageConfigured() {
  return Boolean(process.env.MONGODB_URI);
}

export function extensionOf(name = "") {
  const m = /\.([a-z0-9]{1,5})$/i.exec(name);
  return m ? m[1].toLowerCase() : "";
}

/** Returns the normalised content type, or null when the file type is not allowed. */
export function allowedType(name) {
  return TYPES[extensionOf(name)] || null;
}

export function safeFileName(name = "file") {
  const ext = extensionOf(name);
  const base = name
    .replace(/\.[^.]+$/, "")
    .normalize("NFKD")
    .replace(/[^\w\-. ]+/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
  return `${base || "file"}${ext ? `.${ext}` : ""}`;
}

export function buildKey(prefix, name) {
  return `${prefix.replace(/\/+$/, "")}/${crypto.randomUUID().slice(0, 12)}-${safeFileName(name)}`;
}

export async function bucket() {
  await connectDB();
  return new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: BUCKET_NAME });
}

export async function findFile(key) {
  const [file] = await (await bucket()).find({ filename: key }).limit(1).toArray();
  return file || null;
}

/** Writes an ordered list of buffers into GridFS under `key`. */
export async function writeFile({ key, name, type, chunks }) {
  const gfs = await bucket();
  await deleteKeys([key]);
  const stream = gfs.openUploadStream(key, { contentType: type, metadata: { name, type } });
  for await (const chunk of chunks) {
    if (!stream.write(chunk)) await new Promise((resolve) => stream.once("drain", resolve));
  }
  await new Promise((resolve, reject) => {
    stream.once("finish", resolve);
    stream.once("error", reject);
    stream.end();
  });
  return stream.id;
}

/** Node stream for a whole file or a byte range (inclusive end, as in HTTP Range). */
export async function readFile(key, { start, end } = {}) {
  const file = await findFile(key);
  if (!file) return null;
  const gfs = await bucket();
  const options = {};
  if (Number.isFinite(start)) options.start = start;
  if (Number.isFinite(end)) options.end = Math.min(end + 1, file.length);
  return { file, stream: gfs.openDownloadStreamByName(key, options) };
}

export async function deleteKeys(keys = []) {
  const list = [...new Set(keys.filter(Boolean))];
  if (!list.length) return;
  try {
    const gfs = await bucket();
    for (const key of list) {
      const files = await gfs.find({ filename: key }).toArray();
      for (const file of files) await gfs.delete(file._id);
    }
  } catch (err) {
    console.error("[storage] delete failed", err?.message);
  }
}
