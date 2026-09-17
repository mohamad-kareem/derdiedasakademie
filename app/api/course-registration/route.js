import { NextResponse } from "next/server";

// Deprecated: the app now uses server actions (see app/actions). Safe to delete this folder.
export function POST() {
  return NextResponse.json({ message: "This endpoint has been removed." }, { status: 410 });
}
