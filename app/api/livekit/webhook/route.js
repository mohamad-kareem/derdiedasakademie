import { NextResponse } from "next/server";

// Not used: class recording is disabled, so LiveKit has no webhooks to deliver.
export function POST() {
  return NextResponse.json({ ok: true });
}
