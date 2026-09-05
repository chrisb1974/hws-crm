"use client";

import type { CompletenessItem } from "@/lib/property-card";

/**
 * Dix champs, une barre, et au survol la liste de ce qui manque.
 * Le ton est incitatif, jamais culpabilisant : sur les riads MGH la valeur
 * tourne autour de 6/10 et c'est une situation normale, pas une faute.
 */
export default function Completeness({
  items,
  filled,
  total,
}: {
  items: CompletenessItem[];
  filled: number;
  total: number;
}) {
  const missing = items.filter((item) => !item.filled);
  const ratio = total === 0 ? 0 : filled / total;
  const tone =
    ratio >= 0.8 ? "bg-ok" : ratio >= 0.5 ? "bg-orange-500" : "bg-navy-400";

  return (
    <div className="group relative w-52 shrink-0">
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-encre-45">
          Complétude
        </span>
        <span className="font-mono text-[12px] tabular-nums text-encre-100">
          {filled}/{total}
        </span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-navy-200">
        <div
          className={`h-full rounded-full ${tone}`}
          style={{ width: `${Math.round(ratio * 100)}%` }}
        />
      </div>
      {missing.length > 0 ? (
        <>
          <p className="mt-1 text-[11px] text-encre-45">
            {missing.length === 1
              ? "1 champ à compléter"
              : `${missing.length} champs à compléter`}
          </p>
          <div className="pointer-events-none absolute right-0 top-full z-40 mt-1 hidden w-56 rounded-md border border-bordure-forte bg-surface p-3 shadow-[0_4px_16px_rgba(14,23,59,0.16)] group-hover:block">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-encre-45">
              Il manque
            </p>
            <ul className="space-y-0.5">
              {missing.map((item) => (
                <li key={item.label} className="text-[12px] text-encre-75">
                  {item.label}
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : (
        <p className="mt-1 text-[11px] text-ok">Fiche complète</p>
      )}
    </div>
  );
}
