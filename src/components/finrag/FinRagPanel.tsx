"use client";

import { useCallback, useEffect, useState } from "react";
import { checkFinRagBackend, finragApi, isFinRagDesktop } from "@/lib/finrag/client";
import { finragDocumentStats } from "@/lib/finrag/utils";
import { FinRagChat } from "./FinRagChat";
import { FinRagDocuments } from "./FinRagDocuments";

type Tab = "chat" | "documents";

export function FinRagPanel() {
  const [tab, setTab] = useState<Tab>("chat");
  const [apiOk, setApiOk] = useState<boolean | null>(null);
  const [healthDetail, setHealthDetail] = useState<string>("");
  const [readyCount, setReadyCount] = useState(0);
  const inDesktop = isFinRagDesktop();

  const checkHealth = useCallback(() => {
    checkFinRagBackend().then(({ ready, health }) => {
      if (!ready || !health) {
        setApiOk(false);
        setHealthDetail(
          inDesktop ? "Rust backend lỗi" : "Cần app desktop (npm run desktop:dev)",
        );
        return;
      }
      setApiOk(true);
      setHealthDetail(
        [
          "Tauri + SQLite",
          health.ollama ? "Ollama ✓" : "Ollama ✗",
          health.geminiConfigured ? "Gemini ✓" : "Gemini ✗",
        ].join(" · "),
      );
    });
  }, [inDesktop]);

  useEffect(() => {
    checkHealth();
    const t = setInterval(checkHealth, 15000);
    return () => clearInterval(t);
  }, [checkHealth]);

  useEffect(() => {
    if (!apiOk) return;
    finragApi
      .listDocuments(100)
      .then((docs) => setReadyCount(finragDocumentStats(docs).ready))
      .catch(() => {});
  }, [apiOk]);

  const handleStatsChange = useCallback((stats: ReturnType<typeof finragDocumentStats>) => {
    setReadyCount(stats.ready);
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-2">
        {(
          [
            { id: "chat" as const, label: "Hỏi đáp BCTC" },
            { id: "documents" as const, label: "Báo cáo & upload" },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === item.id
                ? "bg-[var(--accent)] text-white"
                : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
            }`}
          >
            {item.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 text-xs text-[var(--muted)]">
          <span
            className={`h-2 w-2 rounded-full ${
              apiOk === null ? "animate-pulse bg-[var(--muted)]" : apiOk ? "bg-emerald-500" : "bg-red-500"
            }`}
          />
          <span className="hidden sm:inline">{healthDetail || "Tauri + SQLite"}</span>
          <span>
            {apiOk === null ? "Đang kiểm tra…" : apiOk ? "Sẵn sàng" : "Chưa sẵn sàng"}
          </span>
        </div>
      </div>

      {!inDesktop && (
        <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
          Trang này chỉ hoạt động trong <strong>app desktop</strong>. Chạy{" "}
          <code className="rounded bg-[var(--surface-2)] px-1">npm run desktop:dev</code> và mở{" "}
          <code className="rounded bg-[var(--surface-2)] px-1">/bctc</code> trong cửa sổ Finance Buddy
          (không dùng tab trình duyệt riêng).
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {tab === "chat" ? (
          <FinRagChat apiOnline={apiOk === true} readyCount={readyCount} inDesktop={inDesktop} />
        ) : (
          <FinRagDocuments
            apiOnline={apiOk === true}
            inDesktop={inDesktop}
            onStatsChange={handleStatsChange}
          />
        )}
      </div>
    </div>
  );
}
