"use client";

import { t } from "@/lib/i18n";

function pageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set<number>([1, total, current, current - 1, current + 1]);
  const kept = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  kept.forEach((page, index) => {
    if (index > 0 && page - kept[index - 1] > 1) out.push("…");
    out.push(page);
  });
  return out;
}

export default function Pagination({
  page,
  pageCount,
  from,
  to,
  total,
  onChange,
}: {
  page: number;
  pageCount: number;
  from: number;
  to: number;
  total: number;
  onChange: (page: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <p className="font-mono text-[12px] tabular-nums text-encre-60">
        {t.pagination.range(from, to, total)}
      </p>

      {pageCount > 1 ? (
        <nav className="flex items-center gap-1" aria-label="Pagination">
          <button
            type="button"
            onClick={() => onChange(page - 1)}
            disabled={page <= 1}
            aria-label={t.pagination.previous}
            className="rounded border border-bordure-forte bg-surface px-2 py-1 text-[12px] text-encre-75 hover:border-navy-300 hover:text-navy-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ‹
          </button>

          {pageNumbers(page, pageCount).map((entry, index) =>
            entry === "…" ? (
              <span key={`gap-${index}`} className="px-1 text-[12px] text-encre-30">
                …
              </span>
            ) : (
              <button
                key={entry}
                type="button"
                onClick={() => onChange(entry)}
                aria-label={t.pagination.page(entry)}
                aria-current={entry === page ? "page" : undefined}
                className={`min-w-7 rounded border px-2 py-1 font-mono text-[12px] tabular-nums ${
                  entry === page
                    ? "border-navy-500 bg-navy-500 text-white"
                    : "border-bordure-forte bg-surface text-encre-75 hover:border-navy-300 hover:text-navy-700"
                }`}
              >
                {entry}
              </button>
            ),
          )}

          <button
            type="button"
            onClick={() => onChange(page + 1)}
            disabled={page >= pageCount}
            aria-label={t.pagination.next}
            className="rounded border border-bordure-forte bg-surface px-2 py-1 text-[12px] text-encre-75 hover:border-navy-300 hover:text-navy-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ›
          </button>
        </nav>
      ) : null}
    </div>
  );
}
