"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <span className="h-8 w-14 rounded-md border border-[var(--border)] bg-[var(--surface-2)]" />
    );
  }

  const isDark = resolvedTheme === "dark";
  return (
    <div className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-0.5">
      <button
        type="button"
        onClick={() => setTheme("light")}
        className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
          !isDark ? "bg-[var(--surface)] text-[var(--text)] shadow-sm" : "text-[var(--muted)]"
        }`}
      >
        Sáng
      </button>
      <button
        type="button"
        onClick={() => setTheme("dark")}
        className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
          isDark ? "bg-[var(--surface)] text-[var(--text)] shadow-sm" : "text-[var(--muted)]"
        }`}
      >
        Tối
      </button>
      <button
        type="button"
        title="Theo hệ thống"
        onClick={() => setTheme("system")}
        className={`rounded-md px-2 py-1 text-[10px] text-[var(--muted)] hover:text-[var(--text)] ${
          theme === "system" ? "ring-1 ring-blue-500/50" : ""
        }`}
      >
        Auto
      </button>
    </div>
  );
}
