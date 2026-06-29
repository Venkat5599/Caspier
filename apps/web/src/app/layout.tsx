import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/layout/nav";

export const metadata: Metadata = {
  title: "Agent Fabric — Agent skills, served as endpoints",
  description:
    "Turn a SKILL.md into a live REST and MCP endpoint — validated, sandboxed, and metered. On Casper. Pay per call.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="grid-bg min-h-screen">
        <Nav />
        <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
      </body>
    </html>
  );
}
