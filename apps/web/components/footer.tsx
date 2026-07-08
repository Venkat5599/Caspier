"use client";

import { KairosLogo } from "@/components/kairos-logo";
import { ArrowRight, Mail } from "lucide-react";
import Link from "next/link";
import { footerConfig, siteConfig } from "@/lib/config";
import type { ReactNode } from "react";

const footerLinks = {
  menu: [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Publish", href: "/dashboard/create" },
    { label: "Workflows", href: "/dashboard/workflows" },
  ],
  company: [
    { label: "MCP", href: "/dashboard/mcp" },
    { label: "Session keys", href: "/dashboard/session-keys" },
    { label: "GitHub", href: "https://github.com/Venkat5599/kairos" },
  ],
  social: [
    { label: "Sepolia", href: "https://ethereum.org" },
    { label: "x402", href: "https://x402.org" },
  ],
};

export function Footer(): ReactNode {
  return (
    <footer className="relative pt-38 mt-24 mx-2.5 max-[850px]:mx-0">
      <div className="absolute left-1/2 -translate-x-1/2 top-0 w-full max-w-5xl">
        <div className="relative w-full rounded-3xl overflow-hidden shadow-2xl/15">
          <div 
            className="absolute inset-0 bg-center bg-no-repeat brightness-150 blur scale-125"
            style={{ backgroundImage: 'url(/BG.jpg)', backgroundSize: '150%' }}
            aria-hidden="true"
          />
          
          <div className="relative z-10 flex flex-col items-center text-center px-12 py-24 max-[850px]:px-6 max-[850px]:py-6 max-[850px]:pt-12">
            <h2 className="text-6xl max-[850px]:text-3xl text-black font-medium tracking-tight max-w-2xl mb-14 max-[850px]:mb-8">
              {footerConfig.cta.headline}
            </h2>
            
            <form className="flex items-center w-full max-w-md bg-background rounded-xl p-1.5 shadow-lg max-[850px]:flex-col max-[850px]:p-3 max-[850px]:gap-3 max-[850px]:max-w-none" onSubmit={(e) => e.preventDefault()}>
              <div className="flex items-center flex-1 w-full">
                <Mail className="w-5 h-5 text-muted-foreground ml-3 flex-none max-[850px]:ml-1" aria-hidden="true" />
                <input
                  type="email"
                  placeholder={footerConfig.cta.placeholder}
                  aria-label="Email address"
                  className="flex-1 px-3 py-2.5 text-sm bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
              </div>
              <Link
                href="/dashboard"
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-foreground hover:bg-foreground/90 text-background rounded-lg text-sm font-medium transition-colors whitespace-nowrap max-[850px]:w-full max-[850px]:py-3"
              >
                {footerConfig.cta.button}
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </form>
          </div>
        </div>
      </div>

      <div className="bg-accent rounded-tr-[3rem] rounded-tl-[3rem] pt-96 pb-16 max-[850px]:pt-72">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex items-start justify-between gap-12 max-[850px]:flex-col max-[850px]:gap-10">
            <Link href="/" aria-label={`${siteConfig.name} home`}>
              <KairosLogo tile="bg-neutral-900 text-accent" className="[&_span:last-child]:text-neutral-900" />
            </Link>

            <nav className="flex gap-16 max-[850px]:gap-10 max-[850px]:flex-wrap" aria-label="Footer navigation">
              <div>
                <h3 className="text-xs font-medium text-neutral-900/50 uppercase tracking-wider mb-4">Menu</h3>
                <ul className="space-y-2">
                  {footerLinks.menu.map((link) => (
                    <li key={link.label}>
                      <a href={link.href} className="text-sm text-neutral-900 hover:text-neutral-900/70 transition-colors">
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-xs font-medium text-neutral-900/50 uppercase tracking-wider mb-4">Company</h3>
                <ul className="space-y-2">
                  {footerLinks.company.map((link) => (
                    <li key={link.label}>
                      <a href={link.href} className="text-sm text-neutral-900 hover:text-neutral-900/70 transition-colors">
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-xs font-medium text-neutral-900/50 uppercase tracking-wider mb-4">Social</h3>
                <ul className="space-y-2">
                  {footerLinks.social.map((link) => (
                    <li key={link.label}>
                      <a href={link.href} className="text-sm text-neutral-900 hover:text-neutral-900/70 transition-colors">
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </nav>
          </div>

          <div className="mt-16 pt-6">
            <p className="text-sm text-neutral-900/50 text-center">
              {footerConfig.copyright}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
