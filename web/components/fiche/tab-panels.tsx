"use client";

import type { PropertyCard } from "@/lib/property-card";

export function TableShell({
  head,
  children,
}: {
  head: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto px-6 py-4">
      <table className="w-full border-separate border-spacing-0 text-[13px]">
        <thead>
          <tr>
            {head.map((label) => (
              <th
                key={label}
                scope="col"
                className="border-b border-bordure-forte px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-encre-60"
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Cell({
  children,
  mono,
}: {
  children: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <td
      className={`border-b border-bordure px-2 py-1.5 align-middle ${
        mono ? "font-mono text-[12px] tabular-nums" : ""
      }`}
    >
      {children}
    </td>
  );
}

/** Un onglet vide garde une raison d'être : il dit ce que le vide implique. */
export function EmptyTab({
  title,
  meaning,
  warning,
}: {
  title: string;
  meaning: string;
  warning?: string;
}) {
  return (
    <div className="px-6 py-10">
      <p className="text-[14px] font-medium text-encre-100">{title}</p>
      <p className="mt-1 max-w-xl text-[13px] text-encre-60">{meaning}</p>
      {warning ? (
        <p className="mt-3 max-w-xl rounded border border-alerte/30 bg-alerte-fond px-3 py-2 text-[12px] text-alerte">
          {warning}
        </p>
      ) : null}
    </div>
  );
}

export function date(value: unknown): string {
  if (typeof value !== "string" || value === "") return "—";
  const [y, m, d] = value.slice(0, 10).split("-");
  return y && m && d ? `${d}/${m}/${y}` : value;
}

export function text(value: unknown, fallback = "—"): string {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

export function documentsWarning(card: PropertyCard): string | undefined {
  return (card.gosiyaha_dossiers ?? 0) > 0 && !card.logo_url
    ? "Un dossier Go Siyaha est ouvert et le logo est absent : les livrables ne peuvent pas être générés."
    : undefined;
}
