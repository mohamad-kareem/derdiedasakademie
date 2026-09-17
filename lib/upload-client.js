"use client";

import { createUpload } from "@/app/actions/files";

/**
 * Uploads a file through our own API in chunks and returns { key, name, size, type }.
 * Throws an Error whose message is a translation key.
 */
export async function uploadFile(file, { scope, courseId, studentId, onProgress } = {}) {
  const res = await createUpload({ scope, courseId, studentId, name: file.name, size: file.size });
  if (!res.ok) throw new Error(res.error || "files.uploadFailed");

  const total = Math.max(1, Math.ceil(file.size / res.chunkSize));
  for (let i = 0; i < total; i += 1) {
    const blob = file.slice(i * res.chunkSize, (i + 1) * res.chunkSize);
    const sent = await fetch(`/api/files/upload?uploadId=${res.uploadId}&index=${i}`, {
      method: "POST",
      body: blob,
      headers: { "Content-Type": "application/octet-stream" },
    });
    if (!sent.ok) throw new Error(sent.status === 413 ? "files.tooLarge" : "files.uploadFailed");
    onProgress?.(Math.round(((i + 1) / total) * 95));
  }

  const done = await fetch(`/api/files/upload?uploadId=${res.uploadId}&finish=1`, { method: "POST" });
  if (!done.ok) throw new Error("files.uploadFailed");
  onProgress?.(100);
  return { key: res.key, name: file.name, size: file.size, type: res.type };
}
