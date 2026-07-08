"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { KairosMark } from "@/components/kairos-logo";
import { siteConfig } from "@/lib/config";
import { ArrowLeft, KeyRound, LayoutGrid, Plus, Server, Store, Workflow } from "lucide-react";
import { useEffect, useState } from "react";
import { getChainStatus } from "@/lib/api";

const NAV = [
  { href: "/dashboard", label: "Catalog", icon: Store, match: (p: string) => p === "/dashboard" || p.startsWith("/dashboard/apis") },
  { href: "/dashboard/marketplace", label: "Marketplace", icon: LayoutGrid, match: (p: string) => p.startsWith("/dashboard/marketplace") },
  { href: "/dashboard/create", label: "Publish", icon: Plus },
  { href: "/dashboard/workflows", label: "Workflows", icon: Workflow },
  { href: "/dashboard/mcp", label: "MCP", icon: Server },
  { href: "/dashboard/session-keys", label: "Session keys", icon: KeyRound },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const [demo, setDemo] = useState(true);

  useEffect(() => {
    getChainStatus()
      .then((s) => setDemo(s.demoMode))
      .catch(() => null);
  }, []);

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-border bg-frame">
      <div className="border-b border-border p-5">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-black">
            <KairosMark className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-bold">{siteConfig.name}</p>
            <p className="text-[10px] text-muted-foreground">{demo ? "Demo chain" : "Sepolia testnet"}</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {NAV.map(({ href, label, icon: Icon, match }) => {
          const on = match ? match(pathname) : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                on ? "bg-accent/15 text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-4">
        <Link href="/" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Marketing site
        </Link>
      </div>
    </aside>
  );
}
