import { Readable } from "stream";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { canReadKey } from "@/lib/access";
import { findFile, readFile } from "@/lib/storage";

export const runtime = "nodejs";

// GET /api/files?key=…&name=…&inline=1 — permission checked, then streamed from the database.
export async function GET(request) {
  const params = request.nextUrl.searchParams;
  const key = params.get("key") || "";
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!(await canReadKey(user, key))) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const info = await findFile(key);
  if (!info) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const name = params.get("name") || info.metadata?.name || key.split("/").pop();
  const type = info.contentType || info.metadata?.type || "application/octet-stream";
  const disposition = `${params.get("inline") === "1" ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(name)}`;
  const headers = {
    "Content-Type": type,
    "Content-Disposition": disposition,
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=600",
  };

  // Range requests keep audio/video seeking and PDF page loading fast.
  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get("range") || "");
  if (range && (range[1] || range[2])) {
    const start = range[1] ? Number(range[1]) : Math.max(0, info.length - Number(range[2]));
    const end = range[1] && range[2] ? Math.min(Number(range[2]), info.length - 1) : info.length - 1;
    if (start >= info.length || start > end) {
      return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${info.length}` } });
    }
    const { stream } = await readFile(key, { start, end });
    return new NextResponse(Readable.toWeb(stream), {
      status: 206,
      headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${info.length}`, "Content-Length": String(end - start + 1) },
    });
  }

  const { stream } = await readFile(key);
  return new NextResponse(Readable.toWeb(stream), { status: 200, headers: { ...headers, "Content-Length": String(info.length) } });
}
