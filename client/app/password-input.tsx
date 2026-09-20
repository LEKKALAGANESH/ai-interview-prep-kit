"use client";
import { useState } from "react";

type Props = { value: string; onChange: (value: string) => void; autoComplete: string; maxLength?: number };

// Password field with a show/hide eye toggle (buttons are >=44px tall via min-h-11 and keyboard reachable).
export default function PasswordInput({ value, onChange, autoComplete, maxLength }: Props) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        required minLength={8} maxLength={maxLength}
        type={visible ? "text" : "password"} autoComplete={autoComplete}
        value={value} onChange={(e) => onChange(e.target.value)}
        className="min-h-11 w-full rounded-xl border p-3 pr-12"
      />
      <button
        type="button" onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"} aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-xl"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
          <circle cx="12" cy="12" r="3" />
          {visible && <path d="M3 3l18 18" />}
        </svg>
      </button>
    </div>
  );
}
