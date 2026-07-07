"use client";

import { techStackConfig } from "@/lib/config";
import type { ReactNode } from "react";

const badgeClassName =
  "rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-medium text-black shrink-0";

type LogoLoopProps = {
  className?: string;
};

function BadgeRow({ copy }: { copy: number }): ReactNode {
  return (
    <div className="flex shrink-0 items-center gap-3 pr-3" aria-hidden={copy > 0}>
      {techStackConfig.items.map((item) => (
        <span key={`${copy}-${item.name}`} className={badgeClassName}>
          {item.name}
        </span>
      ))}
    </div>
  );
}

export function LogoLoop({ className = "" }: LogoLoopProps): ReactNode {
  return (
    <div className={`relative w-full overflow-hidden ${className}`.trim()}>
      <div className="hidden flex-wrap items-center justify-center gap-3 motion-reduce:flex">
        {techStackConfig.items.map((item) => (
          <span key={item.name} className={badgeClassName}>
            {item.name}
          </span>
        ))}
      </div>

      <div className="flex w-max animate-logo-marquee motion-reduce:hidden">
        <BadgeRow copy={0} />
        <BadgeRow copy={1} />
      </div>
    </div>
  );
}
