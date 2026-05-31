"use client";

import type { SupportedLineTools } from "@/lib/chart/tv-widget-types";

type ToolDef = {
  id: SupportedLineTools;
  label: string;
  title: string;
};

const MEASURE_TOOLS: ToolDef[] = [
  { id: "measure", label: "Thước", title: "Đo % giá và thời gian" },
  { id: "date_and_price_range", label: "Vùng giá+ngày", title: "Date & price range" },
  { id: "price_range", label: "Vùng giá", title: "Price range" },
  { id: "date_range", label: "Vùng ngày", title: "Date range" },
  { id: "trend_line", label: "Trendline", title: "Đường xu hướng" },
  { id: "fib_retracement", label: "Fib", title: "Fibonacci retracement" },
  { id: "long_position", label: "Long", title: "Long position / R:R" },
  { id: "short_position", label: "Short", title: "Short position / R:R" },
  { id: "horizontal_line", label: "H-line", title: "Đường ngang" },
  { id: "parallel_channel", label: "Kênh", title: "Parallel channel" },
];

type Props = {
  onSelectTool: (tool: SupportedLineTools) => void;
  onMagnet?: () => void;
  onResetDrawings?: () => void;
  disabled?: boolean;
};

export function ChartMeasureToolbar({ onSelectTool, onMagnet, onResetDrawings, disabled }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b border-[#363c4e] bg-[#131722] px-3 py-2">
      <span className="mr-1 text-[10px] font-semibold uppercase tracking-wide text-[#787b86]">
        Công cụ đo
      </span>
      {MEASURE_TOOLS.map((t) => (
        <button
          key={t.id}
          type="button"
          disabled={disabled}
          title={t.title}
          onClick={() => onSelectTool(t.id)}
          className="rounded px-2 py-1 text-[11px] font-medium text-[#d1d4dc] transition hover:bg-[#2a2e39] disabled:opacity-40"
        >
          {t.label}
        </button>
      ))}
      <span className="mx-1 h-4 w-px bg-[#363c4e]" />
      {onMagnet && (
        <button
          type="button"
          disabled={disabled}
          title="Magnet — bám OHLC"
          onClick={onMagnet}
          className="rounded px-2 py-1 text-[11px] text-[#d1d4dc] hover:bg-[#2a2e39] disabled:opacity-40"
        >
          Magnet
        </button>
      )}
      {onResetDrawings && (
        <button
          type="button"
          disabled={disabled}
          title="Xóa tất cả hình vẽ"
          onClick={onResetDrawings}
          className="rounded px-2 py-1 text-[11px] text-rose-400 hover:bg-[#2a2e39] disabled:opacity-40"
        >
          Xóa vẽ
        </button>
      )}
    </div>
  );
}
