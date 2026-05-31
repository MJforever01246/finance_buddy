/** Chỉ báo kỹ thuật tính từ chuỗi giá đóng thật (OHLCV bars). */

export type IndicatorChartPoint = {
  t: string;
  close: number;
  ma20?: number;
  ma50?: number;
};

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
