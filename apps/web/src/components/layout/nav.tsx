"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Store, Server, Workflow, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";

const LINKS = [
  { href: "/apis", label: "APIs", icon: Store },
  { href: "/mcp", label: "MCP Servers", icon: Server },
  { href: "/workflows", label: "Workflows", icon: Workflow },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-9">
          <Link href="/" className="text-lg font-bold tracking-tight">
            Agent <span className="text-accent">Fabric</span>
          </Link>
          <nav className="hidden items-center gap-7 sm:flex">
            {LINKS.map(({ href, label, icon: Icon }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-2 text-sm transition-colors",
                    active ? "text-foreground" : "text-muted hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-surface-2">
            <LogIn className="h-4 w-4" />
            Sign In
          </button>
        </div>
      </div>
    </header>
  );
}
