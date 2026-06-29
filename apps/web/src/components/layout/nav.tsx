"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";

const LINKS = [
  { href: "/apis", label: "APIs" },
  { href: "/mcp", label: "MCP Servers" },
  { href: "/workflows", label: "Workflows" },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <div className="sticky top-0 z-50">
      {/* Announcement bar */}
      <div className="bg-ink text-bg">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-6 py-2 text-xs">
          <span className="rounded bg-white/15 px-1.5 py-0.5 font-mono">NEW</span>
          <span>Skills served as endpoints — live on Casper.</span>
          <Link href="/apis" className="inline-flex items-center gap-1 font-medium underline-offset-2 hover:underline">
            Explore <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Nav */}
      <header className="border-b border-border bg-bg/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-10">
            <Link href="/" className="text-lg font-extrabold tracking-tight">
              Agent <span className="text-accent">Fabric</span>
            </Link>
            <nav className="hidden items-center gap-8 md:flex">
              {LINKS.map(({ href, label }) => {
                const active = pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "text-sm font-medium transition-colors",
                      active ? "text-foreground" : "text-muted hover:text-foreground",
                    )}
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button className="hidden rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-foreground sm:block">
              Sign In
            </button>
            <Link
              href="/apis/create"
              className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-bg transition-opacity hover:opacity-90"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>
    </div>
  );
}
