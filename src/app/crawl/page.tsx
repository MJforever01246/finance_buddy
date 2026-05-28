"use client";

import CrawlDashboard from "@/components/CrawlDashboard";
import Link from "next/link";

export default function CrawlPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col">
      <header className="flex items-center gap-4 px-4 py-3 border-b border-[var(--border-color)]">
        <Link
          href="/"
          className="text-xs px-3 py-1.5 rounded bg-[var(--accent-color)] text-white hover:opacity-90 transition"
        >
          ← Dashboard
        </Link>
        <h1 className="text-lg font-semibold">Data Crawler</h1>
      </header>
      <main className="flex-1 overflow-hidden">
        <CrawlDashboard />
      </main>
    </div>
  );
}
