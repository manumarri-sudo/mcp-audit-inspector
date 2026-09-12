import type { Metadata } from "next";
import { Inter, Fraunces, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const sans = Inter({ subsets: ["latin"], variable: "--inter", display: "swap" });
const serif = Fraunces({
  subsets: ["latin"],
  variable: "--serif-font",
  display: "swap",
  weight: ["400", "500", "600"],
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--mono-font",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MCP Audit - check your AI agent's tool descriptions for hidden Unicode",
  description:
    "Inspect MCP tool descriptions for hidden Unicode and suspicious text patterns, with transparent heuristic score deductions.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable} ${mono.variable}`}>
      <body>
        <nav className="nav">
          <Link href="/" className="nav-brand">
            mcp-audit
          </Link>
          <div className="nav-links">
            <Link href="/demo">bytes/eyes</Link>
            <Link href="/methodology">methodology</Link>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
