"use client";

import { useEffect, useState } from "react";
import { loadChartBarsFull } from "@/lib/chart/bars";
import { analyzeBars, type BarAnalysis } from "@/lib/chart/indicators";
import { useAppSelector } from "@/stores/hooks";

function Chip({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "up" | "down" | "neutral" | "warn";
}) {
  const cls =
    tone === "up"
      ? "bg-emerald-500/15 text-emerald-400 ring-emerald-500/30"
      : tone === "down"
        ? "bg-rose-500/15 text-rose-400 ring-rose-500/30"
        : tone === "warn"
          ? "bg-amber-500/15 text-amber-300 ring-amber-500/30"
          : "bg-[#2a2e39] text-[#d1d4dc] ring-[#363c4e]";
  return (
    <div className={`rounded-lg px-3 py-2 ring-1 ${cls}`}>
      <div className="text-[10px] font-medium uppercase tracking-wide opacity-80">{label}</div>
      <div className="font-mono text-sm font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function signalTone(s: BarAnalysis["signal"]): "up" | "down" | "warn" {
  if (s === "bullish") return "up";
  if (s === "bearish") return "down";
  return "warn";
}

function signalLabel(s: BarAnalysis["signal"]): string {
  if (s === "bullish") return "Tích cực";
  if (s === "bearish") return "Tiêu cực";
  return "Trung lập";
}

export function ChartAnalysisPanel() {
  const selectedSymbol = useAppSelector((s) => s.demo.selectedSymbol);
  const symbol = selectedSymbol || "ACB";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<BarAnalysis | null>(null);
  const [source, setSource] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      const result = await loadChartBarsFull(symbol, "D");
      if (cancelled) return;
      setSource(result.detail);
      if (result.bars.length === 0) {
        setAnalysis(null);
        setError(result.detail || "Không có dữ liệu OHLCV");
        setLoading(false);
        return;
      }
      setAnalysis(analyzeBars(symbol, result.bars));
      setLoading(false);
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  return (
    <div className="rounded-b-xl border border-t-0 border-[#363c4e] bg-[#1e222d] px-4 py-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-xs font-semibold text-[#d1d4dc]">Test phân tích kỹ thuật</h4>
          <p className="text-[10px] text-[#787b86]">
            Tính từ OHLCV thật · cùng nguồn chart · {source || "…"}
          </p>
        </div>
        <span className="rounded bg-[#2a2e39] px-2 py-0.5 font-mono text-[11px] font-semibold text-[#2962ff]">
          {symbol}
        </span>
      </div>

      {loading && (
        <p className="text-xs text-[#787b86]">Đang tải &amp; tính chỉ báo…</p>
      )}
      {error && !loading && (
        <p className="text-xs text-rose-400">{error}</p>
      )}

      {analysis && !loading && (
        <>
          <div className="mb-3 flex flex-wrap gap-2">
            <Chip
              label="O / H / L / C"
              value={
                analysis.last
                  ? `${analysis.last.open.toFixed(2)} / ${analysis.last.high.toFixed(2)} / ${analysis.last.low.toFixed(2)} / ${analysis.last.close.toFixed(2)}`
                  : "—"
              }
            />
            <Chip
              label="Δ ngày"
              value={`${analysis.change >= 0 ? "+" : ""}${analysis.change.toFixed(2)} (${analysis.changePct >= 0 ? "+" : ""}${analysis.changePct}%)`}
              tone={analysis.change >= 0 ? "up" : "down"}
            />
            <Chip
              label="RSI(14)"
              value={analysis.rsi14?.toFixed(1) ?? "—"}
              tone={
                analysis.rsi14 != null && analysis.rsi14 >= 70
                  ? "down"
                  : analysis.rsi14 != null && analysis.rsi14 <= 30
                    ? "up"
                    : "neutral"
              }
            />
            <Chip label="MA20" value={analysis.ma20?.toFixed(2) ?? "—"} />
            <Chip label="MA50" value={analysis.ma50?.toFixed(2) ?? "—"} />
            <Chip
              label="Vol / TB20"
              value={
                analysis.volumeRatio != null
                  ? `${(analysis.last?.volume ?? 0).toLocaleString("vi-VN")} (${analysis.volumeRatio}x)`
                  : "—"
              }
            />
            <Chip
              label="Tín hiệu"
              value={signalLabel(analysis.signal)}
              tone={signalTone(analysis.signal)}
            />
          </div>
          <p className="rounded-lg bg-[#131722] px-3 py-2 text-[11px] leading-relaxed text-[#d1d4dc]">
            <span className="font-semibold text-[#787b86]">{analysis.barCount} nến · </span>
            {analysis.summary}
          </p>
        </>
      )}
    </div>
  );
}
