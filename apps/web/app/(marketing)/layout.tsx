import { Header } from "@/components/header";
import { SkipToContent } from "@/components/skip-to-content";
import { ThemeSwitch } from "@/components/theme-switch";
import type { ReactNode } from "react";

export default function MarketingLayout({ children }: { children: ReactNode }): ReactNode {
  return (
    <>
      <div className="site-frame site-frame--top" aria-hidden="true" />
      <div className="site-frame site-frame--bottom" aria-hidden="true" />
      <div className="site-frame site-frame--left" aria-hidden="true" />
      <div className="site-frame site-frame--right" aria-hidden="true" />
      <svg className="site-corner site-corner--top-left" width="50" height="50" viewBox="0 0 50 50" fill="none" aria-hidden="true">
        <path d="M5.50871e-06 0C-0.00788227 37.3001 8.99616 50.0116 50 50H5.50871e-06V0Z" fill="currentColor" />
      </svg>
      <svg className="site-corner site-corner--top-right" width="50" height="50" viewBox="0 0 50 50" fill="none" aria-hidden="true">
        <path d="M5.50871e-06 0C-0.00788227 37.3001 8.99616 50.0116 50 50H5.50871e-06V0Z" fill="currentColor" />
      </svg>
      <svg className="site-corner site-corner--bottom-left" width="50" height="50" viewBox="0 0 50 50" fill="none" aria-hidden="true">
        <path d="M5.50871e-06 0C-0.00788227 37.3001 8.99616 50.0116 50 50H5.50871e-06V0Z" fill="currentColor" />
      </svg>
      <svg className="site-corner site-corner--bottom-right" width="50" height="50" viewBox="0 0 50 50" fill="none" aria-hidden="true">
        <path d="M5.50871e-06 0C-0.00788227 37.3001 8.99616 50.0116 50 50H5.50871e-06V0Z" fill="currentColor" />
      </svg>
      <Header />
      <ThemeSwitch />
      <SkipToContent />
      {children}
    </>
  );
}
