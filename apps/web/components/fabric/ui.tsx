"use client";

import { useState, type ReactNode, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { Copy, Check } from "lucide-react";

/**
 * Render a wei amount in whichever unit actually reads.
 *
 * Converting everything to ETH is the obvious move and the wrong one: this
 * works in small denominations, so a 1,000,000 wei budget becomes
 * "0.000000000001 ETH" — strictly accurate and completely unreadable. Pick the
 * unit by magnitude instead, and abbreviate thousands so the eye can size a
 * number at a glance.
 *
 * The exact figure is never lost — `Amount` keeps it in the title attribute,
 * because on a treasury screen an approximation must always be checkable.
 */
export function formatAmount(value: string | number | bigint | null | undefined): string {
  if (value == null || value === "") return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  if (n === 0) return "0 wei";

  // 1e15 wei = 0.001 ETH: the point where ETH stops being all leading zeros.
  if (n >= 1e15) {
    const eth = n / 1e18;
    return `${eth < 1 ? eth.toFixed(4) : eth.toFixed(3)} ETH`;
  }
  // 1e7 wei = 0.01 gwei — below this, gwei reads worse than plain wei.
  if (n >= 1e7) return `${(n / 1e9).toFixed(n >= 1e10 ? 2 : 4)} gwei`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(n % 1e6 === 0 ? 0 : 1)}M wei`;
  if (n >= 1e4) return `${(n / 1e3).toFixed(n % 1e3 === 0 ? 0 : 1)}K wei`;
  return `${n.toLocaleString()} wei`;
}

/** An amount, abbreviated for reading, exact on hover. */
export function Amount({
  value,
  className = "",
}: {
  value: string | number | bigint | null | undefined;
  className?: string;
}) {
  const n = value == null || value === "" ? null : Number(value);
  const exact = n != null && Number.isFinite(n) ? `${Math.trunc(n).toLocaleString()} wei` : undefined;
  return (
    <span className={className} title={exact}>
      {formatAmount(value)}
    </span>
  );
}

export function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setOk(true);
        setTimeout(() => setOk(false), 1200);
      }}
      className="shrink-0 text-neutral-500 hover:text-accent"
    >
      {ok ? <Check className="h-3.5 w-3.5 text-accent" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

export const short = (s: string | null | undefined, head = 8, tail = 6) =>
  !s ? "—" : s.length > head + tail ? `${s.slice(0, head)}…${s.slice(-tail)}` : s;

export const ETH = (raw: string | number | null | undefined) =>
  raw == null ? "—" : `${Number(raw).toLocaleString()} ETH`;

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 ${className}`}>{children}</div>
  );
}

export function Field({ label, hint, children }: { label: ReactNode; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-semibold text-white">
        {label}
        {hint && <span className="ml-1.5 font-normal text-neutral-500">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border border-white/[0.1] bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder:text-neutral-600 outline-none transition focus:border-accent/60 focus:bg-white/[0.05] ${props.className ?? ""}`}
    />
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-xl border border-white/[0.1] bg-white/[0.03] px-3.5 py-2.5 font-mono text-sm text-white placeholder:text-neutral-600 outline-none transition focus:border-accent/60 focus:bg-white/[0.05] ${props.className ?? ""}`}
    />
  );
}

export function Button({
  children,
  onClick,
  disabled,
  variant = "primary",
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "ghost" | "outline";
  type?: "button" | "submit";
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition active:scale-[0.98] disabled:opacity-50";
  const styles =
    variant === "primary"
      ? "bg-accent text-black hover:brightness-105"
      : variant === "outline"
        ? "border border-white/[0.14] text-white hover:bg-white/[0.05]"
        : "text-neutral-400 hover:text-white";
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${styles}`}>
      {children}
    </button>
  );
}

export function Toggle({
  on,
  onChange,
  label,
  desc,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
  desc?: string;
}) {
  return (
    <button type="button" onClick={() => onChange(!on)} className="flex items-start gap-3 text-left">
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${on ? "border-accent bg-accent" : "border-white/20 bg-white/[0.03]"}`}
      >
        {on && <span className="h-2 w-2 rounded-sm bg-black" />}
      </span>
      <span>
        <span className="block text-sm font-medium text-white">{label}</span>
        {desc && <span className="block text-xs text-neutral-500">{desc}</span>}
      </span>
    </button>
  );
}

export function Chip({ children, accent = false }: { children: ReactNode; accent?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${accent ? "bg-accent/15 text-accent" : "bg-white/[0.06] text-neutral-400"}`}
    >
      {children}
    </span>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/[0.1] px-6 py-10 text-center text-sm text-neutral-500">
      {children}
    </div>
  );
}
