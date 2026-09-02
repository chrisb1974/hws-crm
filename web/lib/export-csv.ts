import { STACK_ROLES, slots, type PropertyRow } from "@/lib/types";

const COLUMNS = [
  "code",
  "nom",
  "groupe",
  "ville",
  "pays",
  "type",
  "chambres",
  "statut",
  "roles_couverts",
  "roles_total",
  "prochain_renouvellement",
  "jours_avant_renouvellement",
  "renouvellements_depasses",
  "depasse_depuis_jours",
  "commercial",
  ...STACK_ROLES.map((role) => `stack_${role.toLowerCase()}`),
];

function escape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(rows: PropertyRow[]): string {
  const lines = [COLUMNS.join(";")];

  for (const row of rows) {
    const stack = slots(row);
    lines.push(
      [
        row.code,
        row.name,
        row.group_name,
        row.city,
        row.country,
        row.property_type,
        row.rooms_total,
        row.lifecycle_status,
        row.roles_covered,
        row.roles_total,
        row.next_renewal_date,
        row.next_renewal_in_days,
        row.overdue_renewals,
        row.overdue_since_days,
        row.sales_owner_name,
        ...STACK_ROLES.map((role) => {
          const slot = stack.find((s) => s.role === role);
          return slot?.filled ? (slot.vendor ?? slot.vendor_code) : "";
        }),
      ]
        .map(escape)
        .join(";"),
    );
  }

  return lines.join("\r\n");
}

export function downloadCsv(filename: string, csv: string) {
  // BOM UTF-8 : sans lui, Excel casse les accents.
  const blob = new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
