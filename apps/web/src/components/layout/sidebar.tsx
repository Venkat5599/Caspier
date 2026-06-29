"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Store, Server, Workflow, Plus, ArrowLeft, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";

const NAV = [
  { href: "/apis", label: "APIs", icon: Store },
  { href: "/apis/create", label: "Create API", icon: Plus },
  { href: "/mcp", label: "MCP Servers", icon: Server },
  { href: "/workflows", label: "Workflows", icon: Workflow },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-border bg-surface">
      <div className="px-5 py-5">
        <Link href="/" className="text-lg font-extrabold tracking-tight">
          Agent <span className="text-accent">Fabric</span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/apis" && pathname.startsWith(href));
          const isApisExact = href === "/apis" && pathname === "/apis";
          const on = href === "/apis" ? isApisExact : active;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                on ? "bg-surface-2 text-foreground" : "text-muted hover:bg-surface-2 hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-2 border-t border-border p-3">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Home
        </Link>
        <div className="flex items-center justify-between px-1">
          <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted transition-colors hover:text-foreground">
            <LogIn className="h-4 w-4" /> Sign In
          </button>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
