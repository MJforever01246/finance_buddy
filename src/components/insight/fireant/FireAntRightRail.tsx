"use client";

const ITEMS = [
  { id: "insight", label: "Insight", icon: "◎" },
  { id: "books", label: "Danh mục", icon: "▤" },
  { id: "alert", label: "Cảnh báo", icon: "⚑" },
  { id: "scenario", label: "Giả định", icon: "◇" },
  { id: "news", label: "Tin", icon: "📰" },
] as const;

export type RailId = (typeof ITEMS)[number]["id"];

export function FireAntRightRail({
  active,
  onSelect,
}: {
  active: RailId;
  onSelect: (id: RailId) => void;
}) {
  return (
    <aside
      className="flex w-11 shrink-0 flex-col items-center gap-1 border-l py-2"
      style={{ borderColor: "var(--fa-border)", background: "var(--fa-surface)" }}
    >
      {ITEMS.map((item) => (
        <button
          key={item.id}
          type="button"
          title={item.label}
          onClick={() => onSelect(item.id)}
          className={`flex w-9 flex-col items-center gap-0.5 rounded py-1.5 text-[9px] leading-tight ${
            active === item.id
              ? "bg-[var(--fa-accent)]/20 text-[var(--fa-accent)]"
              : "text-[var(--fa-muted)] hover:bg-white/5 hover:text-[var(--fa-text)]"
          }`}
        >
          <span className="text-sm">{item.icon}</span>
          <span className="max-w-full truncate px-0.5">{item.label}</span>
        </button>
      ))}
    </aside>
  );
}
