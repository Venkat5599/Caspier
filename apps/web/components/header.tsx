"use client";

import { KairosLogo } from "@/components/kairos-logo";
import { siteConfig } from "@/lib/config";
import { ArrowDownRight, ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useState, type ReactNode } from "react";

const menus = {
  product: [
    { label: "Skill catalog", href: "/dashboard", description: "Browse published APIs" },
    { label: "Marketplace", href: "/dashboard/marketplace", description: "Discover community skills" },
    { label: "Publish skill", href: "/dashboard/create", description: "Upload a SKILL.md" },
    { label: "Workflows", href: "/dashboard/workflows", description: "Kairos workflow automation" },
    { label: "MCP server", href: "/dashboard/mcp", description: "Agent tool discovery" },
  ],
  developers: [
    { label: "Gateway API", href: process.env.NEXT_PUBLIC_GATEWAY_URL ?? "http://localhost:8080", description: "REST catalog + invoke" },
    { label: "Session keys", href: "/dashboard/session-keys", description: "Scoped Sepolia keys" },
    { label: "GitHub", href: "https://github.com/Venkat5599/kairos", description: "Source code" },
  ],
};

const ease = [0.23, 1, 0.32, 1] as const;

function HamburgerIcon({ isOpen }: { isOpen: boolean }): ReactNode {
  return (
    <div className="relative flex h-4 w-8 cursor-pointer flex-col justify-between">
      <motion.span className="block h-0.5 w-full origin-center rounded-full bg-foreground" animate={isOpen ? { rotate: 45, y: 4.5 } : { rotate: 0, y: 0 }} transition={{ duration: 0.25, ease }} />
      <motion.span className="block h-0.5 w-full origin-center rounded-full bg-foreground" animate={isOpen ? { rotate: -45, y: -9.5 } : { rotate: 0, y: 0 }} transition={{ duration: 0.25, ease }} />
    </div>
  );
}

function DesktopDropdown({ label, menuKey, isOpen, onOpen, onClose }: { label: string; menuKey: keyof typeof menus; isOpen: boolean; onOpen: () => void; onClose: () => void }): ReactNode {
  return (
    <div className="relative" onMouseEnter={onOpen} onMouseLeave={onClose}>
      <button className="flex items-center gap-1 rounded-full px-4 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-foreground/5 hover:text-foreground max-[1200px]:px-3" aria-expanded={isOpen}>
        {label}
        <ChevronDown className="h-4 w-4" aria-hidden="true" />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0, y: 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.96 }} transition={{ duration: 0.2, ease }} className="absolute top-full left-0 w-72 pt-2">
            <div className="overflow-hidden rounded-2xl border border-border bg-frame p-2 shadow-lg">
              {menus[menuKey].map((item) => (
                <Link key={item.label} href={item.href} className="block rounded-xl px-4 py-3 transition-colors hover:bg-muted">
                  <div className="text-sm font-medium text-foreground">{item.label}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{item.description}</div>
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const CornerSVG = ({ className }: { className: string }) => (
  <svg className={className} width="50" height="50" viewBox="0 0 50 50" fill="none" aria-hidden="true">
    <path d="M5.50871e-06 0C-0.00788227 37.3001 8.99616 50.0116 50 50H5.50871e-06V0Z" fill="currentColor" />
  </svg>
);

export function Header(): ReactNode {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease }}
      className="fixed top-2.5 left-1/2 z-[9998] w-full max-w-5xl -translate-x-1/2 rounded-b-4xl bg-frame shadow-2xl/20 max-[1200px]:max-w-2xl max-[850px]:top-0 max-[850px]:right-0 max-[850px]:left-0 max-[850px]:w-full max-[850px]:max-w-none max-[850px]:translate-x-0 max-[850px]:overflow-hidden max-[850px]:rounded-none max-[850px]:rounded-b-4xl"
    >
      <div className="flex h-20 items-center justify-between px-4 max-[850px]:h-18 max-[850px]:px-6">
        <Link href="/" className="ml-4 max-[850px]:ml-0" aria-label={`${siteConfig.name} home`}>
          <KairosLogo className="max-[1200px]:[&_span:last-child]:hidden max-[850px]:[&_span:last-child]:inline" />
        </Link>

        <nav className="flex items-center gap-1 max-[850px]:hidden max-[1200px]:gap-0">
          <DesktopDropdown label="Product" menuKey="product" isOpen={activeMenu === "product"} onOpen={() => setActiveMenu("product")} onClose={() => setActiveMenu(null)} />
          <DesktopDropdown label="Developers" menuKey="developers" isOpen={activeMenu === "developers"} onOpen={() => setActiveMenu("developers")} onClose={() => setActiveMenu(null)} />
          <Link href="/dashboard/apis/hello-weather" className="rounded-full px-4 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-foreground/5 hover:text-foreground max-[1200px]:px-3">
            Live demo
          </Link>
        </nav>

        <div className="flex items-center gap-4 max-[850px]:hidden">
          <Link href={siteConfig.nav.signIn.href} className="text-sm font-medium text-foreground/80 transition-colors hover:text-foreground">
            {siteConfig.nav.signIn.text}
          </Link>
          <Link href={siteConfig.nav.cta.href} className="group relative inline-flex items-center">
            <span className="absolute inset-y-0 right-0 w-[calc(100%-1.5rem)] rounded-xl bg-accent" />
            <span className="relative z-10 rounded-xl bg-foreground px-5 py-3 text-sm font-medium text-background">{siteConfig.nav.cta.text}</span>
            <span className="relative -left-px z-10 flex h-10 w-10 items-center justify-center rounded-xl text-black">
              <ArrowDownRight className="h-4 w-4 transition-transform duration-300 group-hover:-rotate-45" />
            </span>
          </Link>
        </div>

        <button className="hidden h-10 w-10 items-center justify-center max-[850px]:flex" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}>
          <HamburgerIcon isOpen={mobileMenuOpen} />
        </button>
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="hidden overflow-hidden max-[850px]:block">
            <div className="space-y-2 px-6 pb-4">
              {[...menus.product, ...menus.developers].map((item) => (
                <Link key={item.label} href={item.href} className="block py-2 text-sm font-medium" onClick={() => setMobileMenuOpen(false)}>
                  {item.label}
                </Link>
              ))}
              <Link href={siteConfig.nav.cta.href} className="mt-4 inline-flex rounded-xl bg-foreground px-5 py-3 text-sm font-medium text-background" onClick={() => setMobileMenuOpen(false)}>
                {siteConfig.nav.cta.text}
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <CornerSVG className="pointer-events-none absolute top-0 -left-12.25 rotate-180 text-frame max-[850px]:hidden" />
      <CornerSVG className="pointer-events-none absolute top-0 -right-12.25 rotate-90 text-frame max-[850px]:hidden" />
    </motion.header>
  );
}
