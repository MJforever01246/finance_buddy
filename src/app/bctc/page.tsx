"use client";

import Link from "next/link";
import { FinRagPanel } from "@/components/finrag/FinRagPanel";

export default function BctcPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg)] text-[var(--text)]">
      <header className="shrink-0 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3">
        <div className="mx-auto flex max-w-[1680px] flex-wrap items-center gap-3">
          <Link
            href="/"
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--accent)] ring-1 ring-[var(--accent)]/30 hover:bg-[var(--accent)]/10"
          >
            ← Dashboard
          </Link>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
              Intelligence Layer · AI đọc BCTC
            </p>
            <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
              Hỏi đáp báo cáo tài chính (RAG)
            </h1>
            <p className="mt-0.5 max-w-2xl text-xs text-[var(--muted)]">
              Chỉ trong app desktop:{" "}
              <code className="rounded bg-[var(--surface-2)] px-1">npm run desktop:dev</code> — Rust +
              SQLite, Ollama embed, Gemini trả lời.
            </p>
          </div>
          <Link
            href="/insight"
            className="rounded-lg px-3 py-1.5 text-xs text-violet-700 ring-1 ring-violet-500/30 hover:bg-violet-500/10 dark:text-violet-300"
          >
            Demo sản phẩm
          </Link>
        </div>
      </header>

      <main className="mx-auto flex min-h-0 w-full max-w-[1680px] flex-1 flex-col overflow-hidden">
        <FinRagPanel />
      </main>
    </div>
  );
}
