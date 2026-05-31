"use client";

import { FinRagPanel } from "@/components/finrag/FinRagPanel";

export default function BctcPage() {
  return (
    <div className="flex min-h-[calc(100dvh-var(--nav-h))] flex-col">
      <div className="fb-panel mx-auto mb-3 mt-3 w-[calc(100%-1.5rem)] max-w-[1680px] px-4 py-3 sm:w-[calc(100%-2rem)]">
        <h1 className="text-lg font-semibold tracking-tight">Hỏi đáp báo cáo tài chính</h1>
        <p className="mt-1 text-xs text-[var(--muted)]">
          FinRAG qua Tauri: upload BCTC, embedding Ollama, trả lời Gemini. Chạy{" "}
          <code className="rounded bg-[var(--surface-2)] px-1">npm run desktop:dev</code>.
        </p>
      </div>
      <div className="mx-auto flex min-h-0 w-full max-w-[1680px] flex-1 flex-col overflow-hidden px-3 pb-4 sm:px-4">
        <FinRagPanel />
      </div>
    </div>
  );
}
