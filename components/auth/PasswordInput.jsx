"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function PasswordInput({ name, autoComplete, minLength }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative block">
      <input name={name} type={show ? "text" : "password"} required minLength={minLength} autoComplete={autoComplete} className="input h-11 pe-10" dir="ltr" />
      <button type="button" onClick={() => setShow((v) => !v)} className="absolute inset-y-0 end-0 flex w-10 items-center justify-center text-muted hover:text-ink" aria-label="Toggle password">
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </span>
  );
}
