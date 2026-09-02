"use client";

import { t } from "@/lib/i18n";

/**
 * Statut et rôles couverts sont derives par la vue : ils sont rendus en
 * lecture seule, sans aucun affordance d'edition (regle de fond n°1).
 */

const STATUS_TONE: Record<string, string> = {
  active: "bg-ok-fond text-ok",
  onboarding: "bg-alerte-fond text-alerte",
  program_only: "bg-navy-100 text-navy-700",
  prospect: "bg-fond text-encre-60",
  suspended: "bg-alerte-fond text-alerte",
  churned: "bg-danger-fond text-danger",
};

export function StatusChip({ status }: { status: string }) {
  const tone = STATUS_TONE[status] ?? "bg-fond text-encre-60";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${tone}`}
    >
      {t.lifecycle[status] ?? status}
    </span>
  );
}

export function RolesCovered({
  covered,
  total,
}: {
  covered: number | null;
  total: number | null;
}) {
  const done = covered ?? 0;
  const outOf = total ?? 8;
  const tone =
    done === 0 ? "text-encre-30" : done >= outOf - 1 ? "text-navy-700" : "text-encre-100";
  return (
    <span className={`font-mono text-[12px] tabular-nums ${tone}`}>
      {done}/{outOf}
    </span>
  );
}

/** Date ISO « YYYY-MM-DD » -> « JJ/MM/AAAA », sans fuseau ni Intl : le rendu
 *  serveur et le rendu client sont identiques. */
function formatDate(value: string): string {
  const [year, month, day] = value.slice(0, 10).split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function renewalTone(days: number): string {
  if (days < 0 || days <= 7) return "bg-danger-fond text-danger";
  if (days <= 30) return "bg-orange-100 text-orange-700";
  if (days <= 60) return "bg-alerte-fond text-alerte";
  return "bg-fond text-encre-60";
}

export function RenewalCell({
  date,
  days,
}: {
  date: string | null;
  days: number | null;
}) {
  // Regle de fond n°2 : un vide se declare.
  if (!date) {
    return <span className="text-[12px] italic text-encre-45">{t.renewal.toFill}</span>;
  }

  const badge =
    days === null
      ? null
      : days < 0
        ? t.renewal.overdue(Math.abs(days))
        : days === 0
          ? t.renewal.today
          : t.renewal.inDays(days);

  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
      <span className="whitespace-nowrap font-mono text-[12px] tabular-nums text-encre-100">
        {formatDate(date)}
      </span>
      {badge ? (
        <span
          className={`whitespace-nowrap rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums ${renewalTone(days ?? 0)}`}
        >
          {badge}
        </span>
      ) : null}
    </span>
  );
}

/** Retard constate, affiche uniquement dans la vue « Échéances dépassées ». */
export function OverdueCell({ days }: { days: number | null }) {
  if (days === null) return <Empty />;
  return (
    <span className="inline-block whitespace-nowrap rounded bg-danger-fond px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums text-danger">
      {t.renewal.overdue(Math.abs(days))}
    </span>
  );
}

export function Empty({ label = "—" }: { label?: string }) {
  return <span className="text-encre-30">{label}</span>;
}
