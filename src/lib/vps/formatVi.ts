/** Định dạng số kiểu VN: nghìn `.`, thập phân `,` (vd 8.936,80). */
export function fmtVi(n: number | undefined, fracDigits = 2): string {
  if (n === undefined || !Number.isFinite(n)) return "—";
  const fixed = fracDigits > 0 ? n.toFixed(fracDigits) : String(Math.round(n));
  const [intRaw, frac] = fixed.split(".");
  const int = intRaw.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return frac !== undefined && fracDigits > 0 ? `${int},${frac}` : int;
}

export function fmtVolVi(n: number | undefined): string {
  if (n === undefined || !Number.isFinite(n) || n <= 0) return "—";
  if (n >= 1e9) return `${fmtVi(n / 1e9, 2)}B`;
  if (n >= 1e6) return `${fmtVi(n / 1e6, 2)}M`;
  if (n >= 1e3) return `${fmtVi(n / 1e3, 1)}k`;
  return fmtVi(n, 0);
}
