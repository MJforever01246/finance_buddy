/**
 * Chỉ báo kỹ thuật — dùng chung ChartsIndicatorsPanel + ChartAnalysisPanel.
 * SMA/RSI: quy ước TA phổ biến (Wilder RSI 14).
 */

import type { ChartBar } from "./bars";

export type IndicatorChartPoint = {
  t: string;
  close: number;
  ma20?: number;
  ma50?: number;
};

export type AnalysisSignal = "bullish" | "bearish" | "neutral";

export type BarAnalysis = {
  symbol: string;
  barCount: number;
  last: ChartBar | null;
  prev: ChartBar | null;
  change: number;
  changePct: number;
  ma20: number | null;
  ma50: number | null;
  rsi14: number | null;
  volumeAvg20: number | null;
  volumeRatio: number | null;
  signal: AnalysisSignal;
  summary: string;
};

/** SMA series (toàn bộ mảng). */
export function sma(values: number[], period: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      out.push(values[i]!);
      continue;
    }
    let s = 0;
    for (let j = 0; j < period; j++) s += values[i - j]!;
    out.push(+(s / period).toFixed(3));
  }
  return out;
}

export function smaLast(values: number[], period: number): number | null {
  const series = sma(values, period);
  if (!series.length) return null;
  return series[series.length - 1] ?? null;
}

export function simpleRsi(closes: number[], period = 14): number {
  if (closes.length < 2) return 50;
  const n = Math.min(period, closes.length - 1);
  let gains = 0;
  let losses = 0;
  for (let i = closes.length - n; i < closes.length; i++) {
    const d = closes[i]! - closes[i - 1]!;
    if (d >= 0) gains += d;
    else losses -= d;
  }
  if (losses === 0) return gains > 0 ? 72 : 50;
  const rs = gains / losses;
  return +(100 - 100 / (1 + rs)).toFixed(1);
}

export function rsi(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;
  return simpleRsi(closes, period);
}

export function barsToIndicatorChart(
  timesMs: number[],
  closes: number[],
  displayLimit = 56,
): IndicatorChartPoint[] {
  const ma20 = sma(closes, 20);
  const ma50 = sma(closes, 50);
  const start = Math.max(0, closes.length - displayLimit);
  const rows: IndicatorChartPoint[] = [];
  for (let i = start; i < closes.length; i++) {
    rows.push({
      t: new Date(timesMs[i]!).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
      }),
      close: closes[i]!,
      ma20: ma20[i],
      ma50: ma50[i],
    });
  }
  return rows;
}

function deriveSignal(
  close: number,
  ma20: number | null,
  ma50: number | null,
  rsi14: number | null,
): { signal: AnalysisSignal; summary: string } {
  const parts: string[] = [];
  let score = 0;

  if (ma20 != null) {
    if (close > ma20) {
      score += 1;
      parts.push("Giá trên MA20");
    } else {
      score -= 1;
      parts.push("Giá dưới MA20");
    }
  }
  if (ma50 != null && ma20 != null) {
    if (ma20 > ma50) {
      score += 1;
      parts.push("MA20 > MA50 (xu hướng tăng)");
    } else if (ma20 < ma50) {
      score -= 1;
      parts.push("MA20 < MA50 (xu hướng giảm)");
    }
  }
  if (rsi14 != null) {
    if (rsi14 >= 70) {
      score -= 1;
      parts.push(`RSI ${rsi14} — quá mua`);
    } else if (rsi14 <= 30) {
      score += 1;
      parts.push(`RSI ${rsi14} — quá bán`);
    } else {
      parts.push(`RSI ${rsi14} — trung tính`);
    }
  }

  const signal: AnalysisSignal = score >= 2 ? "bullish" : score <= -2 ? "bearish" : "neutral";
  const summary = parts.length ? parts.join(" · ") : "Chưa đủ dữ liệu để đánh giá";
  return { signal, summary };
}

/** Phân tích tín hiệu demo từ OHLCV thật (heuristic nội bộ, không phải khuyến nghị đầu tư). */
export function analyzeBars(symbol: string, bars: ChartBar[]): BarAnalysis {
  const sorted = [...bars].sort((a, b) => a.time - b.time);
  const last = sorted.at(-1) ?? null;
  const prev = sorted.at(-2) ?? null;
  const closes = sorted.map((b) => b.close);
  const volumes = sorted.map((b) => b.volume);

  const ma20 = smaLast(closes, 20);
  const ma50 = smaLast(closes, 50);
  const rsi14 = rsi(closes, 14);
  const volumeAvg20 = smaLast(volumes, 20);
  const volumeRatio =
    last && volumeAvg20 && volumeAvg20 > 0
      ? +(last.volume / volumeAvg20).toFixed(2)
      : null;

  const change = last && prev ? +(last.close - prev.close).toFixed(2) : 0;
  const changePct =
    last && prev && prev.close !== 0
      ? +(((last.close - prev.close) / prev.close) * 100).toFixed(2)
      : 0;

  const { signal, summary } = last
    ? deriveSignal(last.close, ma20, ma50, rsi14)
    : { signal: "neutral" as const, summary: "Không có nến" };

  return {
    symbol,
    barCount: sorted.length,
    last,
    prev,
    change,
    changePct,
    ma20,
    ma50,
    rsi14,
    volumeAvg20,
    volumeRatio,
    signal,
    summary,
  };
}
