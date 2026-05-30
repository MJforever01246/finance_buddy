"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  finragApi,
  FinRagError,
  type FinRagChatMessage,
  type FinRagChatSession,
} from "@/lib/finrag/client";
import { FinRagCitations } from "./FinRagCitations";

const SUGGESTIONS = [
  "Doanh thu FPT năm 2025 là bao nhiêu?",
  "So sánh lợi nhuận quý 4/2025 của FPT",
  "Báo cáo kiểm toán có ý kiến ngoại trừ không?",
  "Rủi ro lớn nhất trong thuyết minh BCTC là gì?",
];

type Props = {
  apiOnline: boolean;
  readyCount: number;
  inDesktop: boolean;
};

export function FinRagChat({ apiOnline, readyCount, inDesktop }: Props) {
  const [sessions, setSessions] = useState<FinRagChatSession[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<FinRagChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadSessions = useCallback(async () => {
    const list = await finragApi.listSessions();
    setSessions(list);
    return list;
  }, []);

  const loadMessages = useCallback(async (id: string) => {
    const msgs = await finragApi.listMessages(id);
    setMessages(msgs);
  }, []);

  const ensureSession = useCallback(async () => {
    const list = await loadSessions();
    if (list.length > 0) {
      setSessionId(list[0].id);
      await loadMessages(list[0].id);
      return list[0].id;
    }
    const created = await finragApi.createSession();
    setSessions([created]);
    setSessionId(created.id);
    setMessages([]);
    return created.id;
  }, [loadSessions, loadMessages]);

  useEffect(() => {
    if (!apiOnline) return;
    ensureSession().catch((e) =>
      setError(e instanceof Error ? e.message : "Lỗi tải phiên chat"),
    );
  }, [apiOnline, ensureSession]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function newSession() {
    setError(null);
    const created = await finragApi.createSession();
    setSessions((prev) => [created, ...prev]);
    setSessionId(created.id);
    setMessages([]);
  }

  async function selectSession(id: string) {
    setSessionId(id);
    setError(null);
    await loadMessages(id);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading || !apiOnline) return;

    let sid = sessionId;
    if (!sid) {
      sid = await ensureSession();
    }

    setInput("");
    setError(null);
    setLoading(true);

    const optimisticUser: FinRagChatMessage = {
      id: `tmp-${Date.now()}`,
      sessionId: sid,
      role: "user",
      content: text,
      citations: null,
    };
    setMessages((prev) => [...prev, optimisticUser]);

    try {
      const reply = await finragApi.sendMessage(sid, text);
      setMessages((prev) => {
        const withoutTmp = prev.filter((m) => m.id !== optimisticUser.id);
        return [...withoutTmp, { ...optimisticUser, id: `user-${reply.id}` }, reply];
      });
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticUser.id));
      if (err instanceof FinRagError) setError(err.message);
      else setError("Không gửi được tin nhắn. Kiểm tra Ollama và GEMINI_API_KEY.");
    } finally {
      setLoading(false);
    }
  }

  if (!apiOnline) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        {!inDesktop ? (
          <>
            <p className="text-sm font-medium text-[var(--text)]">Cần mở bằng app desktop</p>
            <p className="max-w-md text-xs text-[var(--muted)]">
              FinRAG chạy trong Tauri (Rust + SQLite), không qua server Node riêng.
            </p>
            <code className="rounded-lg bg-[var(--surface-2)] px-4 py-2 text-sm">
              npm run desktop:dev
            </code>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-[var(--text)]">FinRAG chưa sẵn sàng</p>
            <p className="max-w-md text-xs text-[var(--muted)]">
              Kiểm tra Ollama (<code className="rounded px-1">ollama pull nomic-embed-text</code>) và
              biến môi trường <code className="rounded px-1">GEMINI_API_KEY</code> trước khi khởi động
              app.
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1">
      <aside className="hidden w-48 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface-2)] p-3 lg:flex">
        <button
          type="button"
          onClick={newSession}
          className="mb-3 w-full rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          + Cuộc trò chuyện mới
        </button>
        <p className="mb-2 text-[10px] uppercase tracking-wide text-[var(--muted)]">Lịch sử</p>
        <ul className="flex-1 space-y-1 overflow-y-auto">
          {sessions.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => selectSession(s.id)}
                className={`w-full truncate rounded-lg px-2 py-2 text-left text-xs ${
                  sessionId === s.id
                    ? "bg-[var(--accent)]/15 text-[var(--accent)] ring-1 ring-[var(--accent)]/30"
                    : "text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--text)]"
                }`}
              >
                {s.title ?? "Cuộc hỏi đáp"}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-[var(--border)] px-4 py-3">
          <h2 className="text-base font-semibold text-[var(--text)]">Hỏi đáp BCTC</h2>
          <p className="text-xs text-[var(--muted)]">
            {readyCount > 0
              ? `${readyCount} báo cáo sẵn sàng — trả lời có trích dẫn nguồn.`
              : "Chưa có báo cáo ready — upload hoặc chờ seed tự động."}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {messages.length === 0 && !loading && (
            <div className="mx-auto max-w-xl py-6">
              <p className="text-center text-sm text-[var(--muted)]">
                Đặt câu hỏi về báo cáo tài chính VN (doanh thu, lợi nhuận, thuyết minh…)
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setInput(q)}
                    className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--text)] hover:border-[var(--accent)]/40 hover:text-[var(--accent)]"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mx-auto max-w-3xl space-y-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-[var(--accent)] text-white"
                      : "border border-[var(--border)] bg-[var(--surface)] text-[var(--text)]"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>
                  {m.role === "assistant" && m.citations?.sources && (
                    <FinRagCitations sources={m.citations.sources} />
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--muted)]">
                  Đang tìm và trả lời…
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        {error && (
          <p className="mx-4 mb-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
            {error}
          </p>
        )}

        <form
          onSubmit={onSubmit}
          className="border-t border-[var(--border)] bg-[var(--surface)] p-4"
        >
          <div className="mx-auto flex max-w-3xl gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nhập câu hỏi về báo cáo tài chính…"
              disabled={loading}
              className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/40 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Gửi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
