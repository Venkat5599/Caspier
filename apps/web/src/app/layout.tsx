import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agent Fabric — Agents with limits",
  description:
    "Programmable permissions for AI agents. Turn a SKILL.md into a live, sandboxed, x402-metered REST + MCP endpoint on Casper. Pay per call.",
  icons: { icon: "/favicon.svg" },
};

// Apply persisted theme before paint to avoid a flash.
const themeScript = `(function(){try{if(localStorage.getItem('theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Geist+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
