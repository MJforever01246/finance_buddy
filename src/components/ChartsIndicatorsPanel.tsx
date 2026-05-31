"use client";

import { useTheme } from "next-themes";
import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fetchChartBars } from "@/lib/chart/bars";
import type { ChartDataSource } from "@/lib/chart/debug";
import {
  barsToIndicatorChart,
  simpleRsi,
  sma,
} from "@/lib/chart/indicators";
import { isTauriRuntime } from "@/lib/tauri-env";
import { useAppSelector } from "@/stores/hooks";

function sourceLabel(source: ChartDataSource | ""): string {
  switch (source) {
    case "vps":
      return "VPS live";
    case "sqlite":
      return "SQLite cache";
    case "json":
    case "json-fallback-all":
      return "JSON mẫu";
    default:
      return isTauriRuntime() ? "VPS / SQLite" : "JSON mẫu";
  }
}

function IndicatorChip({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "up" | "down" | "neutral";
}) {
  const cls =
    accent === "up"
      ? "bg-[var(--up-bg)] text-[var(--up)]"
      : accent === "down"
        ? "bg-[var(--down-bg)] text-[var(--down)]"
        : "bg-[var(--surface-2)] text-[var(--text)]";
  return (
    <div className={`rounded-lg px-3 py-2 ${cls}`}>
      <div className="text-[10px] font-medium uppercase tracking-wide opacity-80">{label}</div>
      <div className="font-data text-sm font-semibold">{value}</div>
    </div>
  );
}

export function ChartsIndicatorsPanel() {
  const selectedSymbol = useAppSelector((s) => s.demo.selectedSymbol);
  const prices = useAppSelector((s) => s.demo.prices);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchDetail, setFetchDetail] = useState("");
  const [dataSource, setDataSource] = useState<ChartDataSource | "">("");
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [closes, setCloses] = useState<number[]>([]);
  const [timesMs, setTimesMs] = useState<number[]>([]);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!selectedSymbol) {
      setCloses([]);
      setTimesMs([]);
      setDataSource("");
      setFetchDetail("");
      setFetchError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setFetchError(null);

    void fetchChartBars(selectedSymbol, "D").then((result) => {
      if (cancelled) return;
      setDataSource(result.source);
      setFetchDetail(result.detail);
      if (result.error) setFetchError(result.error);
      setCloses(result.bars.map((b) => b.close));
      setTimesMs(result.bars.map((b) => b.time));
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [selectedSymbol]);

  const livePrice = selectedSymbol ? (prices[selectedSymbol] ?? 0) : 0;

  const { chartRows, rsi, ma20last, ma50last, lastClose } = useMemo(() => {
    if (!closes.length) {
      return { chartRows: [], rsi: 50, ma20last: 0, ma50last: 0, lastClose: livePrice };
    }
    const rsi = simpleRsi(closes);
    const ma20 = sma(closes, 20);
    const ma50 = sma(closes, 50);
    const lastClose = closes[closes.length - 1] ?? livePrice;
    return {
      chartRows: barsToIndicatorChart(timesMs, closes),
      rsi,
      ma20last: ma20[closes.length - 1] ?? lastClose,
      ma50last: ma50[closes.length - 1] ?? lastClose,
      lastClose,
    };
  }, [closes, timesMs, livePrice]);

  const gridStroke = resolvedTheme === "dark" ? "#334155" : "#e2e8f0";
  const axisStroke = resolvedTheme === "dark" ? "#94a3b8" : "#64748b";

  if (!mounted) {
    return (
      <div className="h-[340px] animate-pulse rounded-lg border border-[var(--border)] bg-[var(--surface-2)]" />
    );
  }

  if (!selectedSymbol) {
    return (
      <div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-2)] text-sm text-[var(--muted)]">
        Chọn mã ở bảng giá để xem chỉ báo & biểu đồ.
      </div>
    );
  }

  const rsiAccent = rsi >= 70 ? "up" : rsi <= 30 ? "down" : "neutral";

  return (
    <div className="fb-panel flex flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[var(--text)]">Chỉ báo & biểu đồ</h2>
          <p className="text-xs text-[var(--muted)]">
            OHLCV ngày · MA20 / MA50 · RSI(14) ·{" "}
            <span className="font-data">{sourceLabel(dataSource)}</span>
            {fetchDetail ? ` · ${fetchDetail}` : null}
          </p>
        </div>
        <span className="rounded-md bg-[var(--surface-2)] px-2 py-1 font-data text-xs font-semibold text-[var(--text)]">
          {selectedSymbol}
        </span>
      </div>

      {loading && (
        <p className="text-xs text-[var(--muted)]">Đang tải lịch sử giá…</p>
      )}
      {fetchError && (
        <p className="text-xs text-[var(--down)]">{fetchError}</p>
      )}
      {!loading && !closes.length && !fetchError && (
        <p className="text-xs text-[var(--muted)]">
          Không có dữ liệu nến — thử Tauri desktop hoặc mã có trong JSON mẫu.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <IndicatorChip label="RSI(14)" value={rsi.toFixed(1)} accent={rsiAccent} />
        <IndicatorChip label="MA20" value={ma20last.toFixed(2)} accent="neutral" />
        <IndicatorChip label="MA50" value={ma50last.toFixed(2)} accent="neutral" />
        <IndicatorChip label="Đóng" value={lastClose.toFixed(2)} accent="neutral" />
      </div>

      {chartRows.length > 0 && (
        <div className="h-[280px] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartRows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
              <XAxis
                dataKey="t"
                tick={{ fontSize: 10, fill: axisStroke }}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={["auto", "auto"]}
                tick={{ fontSize: 10, fill: axisStroke }}
                tickLine={false}
                width={48}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "var(--text)",
                }}
                formatter={(value) => [
                  typeof value === "number" ? value.toFixed(2) : String(value ?? ""),
                  "",
                ]}
              />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
              <Line
                type="monotone"
                dataKey="close"
                name="Đóng"
                stroke="var(--accent)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="ma20"
                name="MA20"
                stroke="#d97706"
                strokeWidth={1.5}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="ma50"
                name="MA50"
                stroke="#64748b"
                strokeWidth={1.5}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
