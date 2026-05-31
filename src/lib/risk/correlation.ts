/** Tương quan & tập trung — port từ rust-finance `correlation.rs`. */

export function rollingCorrelation(
  returnsA: number[],
  returnsB: number[],
  window: number,
): number {
  const n = Math.min(returnsA.length, returnsB.length, window);
  if (n < 3) return 0;

  const a = returnsA.slice(-n);
  const b = returnsB.slice(-n);
  const meanA = a.reduce((s, x) => s + x, 0) / n;
  const meanB = b.reduce((s, x) => s + x, 0) / n;

  let cov = 0;
  let varA = 0;
  let varB = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i]! - meanA;
    const db = b[i]! - meanB;
    cov += da * db;
    varA += da * da;
    varB += db * db;
  }
  cov /= n;
  const stdA = Math.sqrt(varA / n);
  const stdB = Math.sqrt(varB / n);
  if (stdA < 1e-10 || stdB < 1e-10) return 0;
  return Math.max(-1, Math.min(1, cov / (stdA * stdB)));
}

export function avgPairwiseCorrelation(
  returnSeries: number[][],
  window = 30,
): number | null {
  const n = returnSeries.length;
  if (n < 2) return null;
  const minLen = Math.min(...returnSeries.map((s) => s.length));
  if (minLen < Math.max(window, 3)) return null;

  let sum = 0;
  let count = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      sum += Math.abs(rollingCorrelation(returnSeries[i]!, returnSeries[j]!, window));
      count++;
    }
  }
  return count === 0 ? null : sum / count;
}
