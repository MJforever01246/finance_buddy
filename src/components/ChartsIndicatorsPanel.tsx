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
import {
  buildCloseSeriesDeterministic,
  simpleRsi,
  sma,
  toChartData,
} from "@/lib/chart-mock";
import { useDemoStore } from "@/stores/demo-store";

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
      <div className="font-mono text-sm font-semibold tabular-nums">{value}</div>
    </div>
  );
}

export function ChartsIndicatorsPanel() {
  const selectedSymbol = useDemoStore((s) => s.selectedSymbol);
  const prices = useDemoStore((s) => s.prices);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const price = selectedSymbol ? (prices[selectedSymbol] ?? 0) : 0;

  const { chartRows, rsi, ma20last, ma50last } = useMemo(() => {
    if (!selectedSymbol || !price) {
      return { chartRows: [], rsi: 50, ma20last: 0, ma50last: 0 };
    }
    const seed = `${selectedSymbol}-${price.toFixed(2)}`;
    const closes = buildCloseSeriesDeterministic(price, seed, 56);
    const rsi = simpleRsi(closes);
    const ma20 = sma(closes, 20);
    const ma50 = sma(closes, 50);
    const chartRows = toChartData(closes);
    return {
      chartRows,
      rsi,
      ma20last: ma20[closes.length - 1] ?? price,
      ma50last: ma50[closes.length - 1] ?? price,
    };
  }, [selectedSymbol, price]);

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

  const rsiAccent =
    rsi >= 70 ? "up" : rsi <= 30 ? "down" : "neutral";

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[var(--text)]">Chỉ báo & biểu đồ</h2>
          <p className="text-xs text-[var(--muted)]">
            Giá đóng giả lập (seed theo mã + giá) · MA · RSI đơn giản — demo UX.
          </p>
        </div>
        <span className="rounded-md bg-[var(--surface-2)] px-2 py-1 font-mono text-xs font-semibold text-[var(--text)]">
          {selectedSymbol}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <IndicatorChip label="RSI(14)" value={rsi.toFixed(1)} accent={rsiAccent} />
        <IndicatorChip label="MA20" value={ma20last.toFixed(2)} accent="neutral" />
        <IndicatorChip label="MA50" value={ma50last.toFixed(2)} accent="neutral" />
        <IndicatorChip
          label="Giá"
          value={price.toFixed(2)}
          accent="neutral"
        />
      </div>

      <div className="h-[280px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartRows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
            <XAxis dataKey="t" tick={{ fontSize: 10, fill: axisStroke }} tickLine={false} />
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
              stroke="#2563eb"
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
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
