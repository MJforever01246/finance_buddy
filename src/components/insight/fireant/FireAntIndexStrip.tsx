"use client";

/** Chỉ số demo — hàng thẻ + sparkline kiểu FireAnt */
const INDICES = [
  { id: "VNINDEX", value: 1245.32, chg: 0.45, pts: [0.2, 0.35, 0.3, 0.5, 0.48, 0.55, 0.52] },
  { id: "VN30", value: 1280.1, chg: -0.12, pts: [0.5, 0.48, 0.45, 0.42, 0.4, 0.38, 0.36] },
  { id: "HNX", value: 248.6, chg: 0.22, pts: [0.3, 0.32, 0.35, 0.38, 0.4, 0.42, 0.44] },
  { id: "UPCOM", value: 92.15, chg: -0.08, pts: [0.45, 0.44, 0.43, 0.42, 0.41, 0.4, 0.39] },
] as const;

function Sparkline({ pts, up }: { pts: readonly number[]; up: boolean }) {
  const w = 56;
  const h = 22;
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const range = max - min || 1;
  const d = pts
    .map((p, i) => {
      const x = (i / (pts.length - 1)) * w;
      const y = h - ((p - min) / range) * (h - 2) - 1;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h} className="shrink-0 opacity-80">
      <path d={d} fill="none" stroke={up ? "var(--fa-up)" : "var(--fa-down)"} strokeWidth="1.2" />
    </svg>
  );
}

export function FireAntIndexStrip() {
  return (
    <div
      className="flex shrink-0 gap-px overflow-x-auto border-b"
      style={{ borderColor: "var(--fa-border)", background: "var(--fa-surface-2)" }}
    >
      {INDICES.map((idx) => {
        const up = idx.chg >= 0;
        return (
          <div
            key={idx.id}
            className="flex min-w-[140px] shrink-0 items-center gap-2 border-r px-2.5 py-1.5"
            style={{ borderColor: "var(--fa-border)", background: "var(--fa-surface)" }}
          >
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold text-[var(--fa-text)]">{idx.id}</p>
              <p className="tabular-nums text-[11px] font-medium">{idx.value.toLocaleString("vi-VN")}</p>
              <p className={`tabular-nums text-[10px] ${up ? "text-up" : "text-down"}`}>
                {up ? "+" : ""}
                {idx.chg.toFixed(2)}%
              </p>
            </div>
            <Sparkline pts={idx.pts} up={up} />
          </div>
        );
      })}
    </div>
  );
}
