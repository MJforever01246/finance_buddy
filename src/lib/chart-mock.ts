/** Chuỗi giá giả lập cho demo chart — neo vào giá hiện tại (deterministic theo seed) */

export type ChartPoint = {
  t: number;
  close: number;
  ma20?: number;
};

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildCloseSeriesDeterministic(
  endPrice: number,
  seedKey: string,
  points = 56,
): number[] {
  let h = 0;
  for (let i = 0; i < seedKey.length; i++) h = Math.imul(31, h) + seedKey.charCodeAt(i);
  const rnd = mulberry32(h || 1);
  let p = endPrice * (0.88 + rnd() * 0.08);
  const out: number[] = [];
  for (let i = 0; i < points - 1; i++) {
    p *= 1 + (rnd() - 0.495) * 0.028;
    out.push(+p.toFixed(2));
  }
  out.push(+endPrice.toFixed(2));
  return out;
}

export function sma(values: number[], period: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      out.push(values[i]);
      continue;
    }
    let s = 0;
    for (let j = 0; j < period; j++) s += values[i - j];
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
    const d = closes[i] - closes[i - 1];
    if (d >= 0) gains += d;
    else losses -= d;
  }
  if (losses === 0) return gains > 0 ? 72 : 50;
  const rs = gains / losses;
  return +(100 - 100 / (1 + rs)).toFixed(1);
}

export function toChartData(closes: number[]): ChartPoint[] {
  const ma20 = sma(closes, 20);
  return closes.map((close, i) => ({
    t: i,
    close,
    ma20: ma20[i],
  }));
}
