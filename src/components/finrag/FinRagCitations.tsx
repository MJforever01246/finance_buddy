import type { FinRagCitationSource } from "@/lib/finrag/client";

export function FinRagCitations({ sources }: { sources: FinRagCitationSource[] }) {
  if (!sources.length) return null;

  return (
    <div className="mt-3 border-t border-[var(--border)] pt-3">
      <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">
        Nguồn trích dẫn
      </p>
      <ul className="space-y-2">
        {sources.map((s, i) => (
          <li
            key={s.chunk_id ?? i}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--text)]"
          >
            <span className="font-medium text-[var(--accent)]">[{i + 1}]</span>{" "}
            {s.report_period && <span>{s.report_period} · </span>}
            {s.fiscal_year != null && (
              <span>
                {s.fiscal_year}
                {s.fiscal_quarter ? ` Q${s.fiscal_quarter}` : ""} ·{" "}
              </span>
            )}
            {s.section && <span>{s.section}</span>}
            {(s.page_start ?? s.page_end) != null && (
              <span className="text-[var(--muted)]">
                {" "}
                · trang {s.page_start}
                {s.page_end && s.page_end !== s.page_start ? `–${s.page_end}` : ""}
              </span>
            )}
            {s.score != null && (
              <span className="ml-1 text-[var(--muted)]">
                ({Math.round(s.score * 100)}%)
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
