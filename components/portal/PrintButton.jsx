"use client";

import { Printer } from "lucide-react";

export default function PrintButton({ label }) {
  return (
    <button type="button" onClick={() => window.print()} className="btn btn-primary">
      <Printer className="size-4" /> {label}
    </button>
  );
}
