"use client";

import { useState } from "react";
import type { Insight } from "@/lib/layers/types";
import { fmtVi } from "@/lib/vps/formatVi";
import type { DemoBook } from "../demoBooks";

type Tab = "tong-hop" | "insight" | "risk" | "vi-the";

export function FireAntBookPanel({
  book,
  market,
  pnlPct,
  risk,
  maxSymbol,
  maxPct,
  weights,
  insights,
  scenarioNote,
}: {
  book: DemoBook;
  market: number;
  pnlPct: number;
  risk: number;
  maxSymbol: string;
  maxPct: number;
  weights: { symbol: string; pct: number }[];
  insights: Insight[];
  scenarioNote?: string;
}) {
  const [tab, setTab] = useState<Tab>("tong-hop");
  const up = pnlPct >= 0;
  const tabs: { id: Tab; label: string }[] = [
    { id: "tong-hop", label: "Tổng hợp" },
    { id: "insight", label: "Insight" },
    { id: "risk", label: "Risk" },
    { id: "vi-the", label: "Vị thế" },
  ];

  return (
    <aside
      className="flex w-[min(100%,300px)] min-w-[260px] shrink-0 flex-col border-l"
      style={{ borderColor: "var(--fa-border)", background: "var(--fa-surface)" }}
    >
      <div className="border-b px-3 py-2" style={{ borderColor: "var(--fa-border)" }}>
        <p className="text-[10px] text-[var(--fa-muted)]">Danh mục đang chọn</p>
        <p className="truncate text-sm font-semibold">{book.label}</p>
        <div className="mt-1 flex items-baseline justify-between">
          <span className={`text-lg font-bold tabular-nums ${up ? "text-up" : "text-down"}`}>
            {up ? "+" : ""}
            {pnlPct.toFixed(2)}%
          </span>
          <span className="text-[11px] tabular-nums text-[var(--fa-muted)]">
            {fmtVi(market / 1e6, 2)}M
          </span>
        </div>
        {scenarioNote ? (
          <p className="mt-1 rounded bg-amber-500/15 px-2 py-1 text-[10px] text-amber-200">{scenarioNote}</p>
        ) : null}
      </div>

      <div className="flex border-b text-[10px]" style={{ borderColor: "var(--fa-border)" }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 border-r px-2 py-1.5 last:border-r-0 ${
              tab === t.id
                ? "bg-white/10 font-medium text-[var(--fa-text)]"
                : "text-[var(--fa-muted)] hover:text-[var(--fa-text)]"
            }`}
            style={{ borderColor: "var(--fa-border)" }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {tab === "tong-hop" && (
          <dl className="space-y-1.5 text-[11px]">
            <Row k="Risk score" v={String(risk)} />
            <Row k="Tập trung" v={`${maxSymbol} ${maxPct.toFixed(0)}%`} />
            <Row k="Loại sổ" v={book.role === "own" ? "Của tôi" : book.role === "client" ? "Khách" : "Giả định"} />
          </dl>
        )}
        {tab === "insight" && (
          <ul className="space-y-1.5">
            {insights.length ? (
              insights.slice(0, 8).map((ins) => (
                <li
                  key={ins.id}
                  className="rounded border px-2 py-1.5"
                  style={{ borderColor: "var(--fa-border)" }}
                >
                  <p className="font-medium leading-snug">{ins.title}</p>
                  <p className="mt-0.5 text-[10px] text-[var(--fa-muted)]">{ins.detail}</p>
                </li>
              ))
            ) : (
              <p className="text-[11px] text-[var(--fa-muted)]">Chưa có insight — mô phỏng tick.</p>
            )}
          </ul>
        )}
        {tab === "risk" && (
          <div className="space-y-2">
            {weights.map((w) => (
              <div key={w.symbol}>
                <div className="flex justify-between text-[11px]">
                  <span>{w.symbol}</span>
                  <span className="tabular-nums">{w.pct.toFixed(1)}%</span>
                </div>
                <div className="mt-0.5 h-1 rounded-full bg-black/30">
                  <div
                    className={`h-full rounded-full ${w.symbol === maxSymbol && maxPct >= 35 ? "bg-rose-500" : "bg-[var(--fa-accent)]"}`}
                    style={{ width: `${w.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
        {tab === "vi-the" && (
          <table className="w-full text-[10px]">
            <thead className="text-[var(--fa-muted)]">
              <tr>
                <th className="py-0.5 text-left">Mã</th>
                <th className="py-0.5 text-right">%</th>
              </tr>
            </thead>
            <tbody>
              {weights.map((w) => (
                <tr key={w.symbol} className="border-t" style={{ borderColor: "var(--fa-border)" }}>
                  <td className="py-0.5 font-medium">{w.symbol}</td>
                  <td className="py-0.5 text-right tabular-nums">{w.pct.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </aside>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-2 rounded px-2 py-1" style={{ background: "var(--fa-surface-2)" }}>
      <dt className="text-[var(--fa-muted)]">{k}</dt>
      <dd className="font-medium tabular-nums">{v}</dd>
    </div>
  );
}
