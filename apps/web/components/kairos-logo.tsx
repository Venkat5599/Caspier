import { siteConfig } from "@/lib/config";
import type { ReactNode } from "react";

export function KairosMark({ className = "h-5 w-5" }: { className?: string }): ReactNode {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <path d="M8 7 V25" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M8 16 L20 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 16 L24 25" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function KairosLogo({
  className = "",
  tile = "bg-accent text-black",
  word = true,
}: {
  className?: string;
  tile?: string;
  word?: boolean;
}): ReactNode {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${tile}`}>
        <KairosMark className="h-4 w-4" />
      </span>
      {word && <span className="text-lg font-semibold leading-none tracking-tight">{siteConfig.name}</span>}
    </span>
  );
}
