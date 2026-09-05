"use client";

import { useState } from "react";
import { t } from "@/lib/i18n";
import { slots, type StackSlot } from "@/lib/types";
import type { PropertyCard } from "@/lib/property-card";

function formatDate(value: string | null): string {
  if (!value) return "";
  const [year, month, day] = value.slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

/** Version large du croquis : mêmes conventions que la liste, nom complet. */
function StackCard({ slot, onEmptyClick }: { slot: StackSlot; onEmptyClick: () => void }) {
  const role = t.roles[slot.role] ?? slot.role;
  const roleLong = t.rolesLong[slot.role] ?? slot.role;

  if (!slot.filled) {
    return (
      <button
        type="button"
        onClick={onEmptyClick}
        title={`${slot.role} — ${t.stack.empty}. Créer un lead.`}
        className="flex h-20 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-bordure-forte px-2 text-center hover:border-orange-500 hover:bg-orange-100"
      >
        <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-encre-45">
          {role}
        </span>
        {/* Un rôle vide est une opportunité, pas un trou. */}
        <span className="text-[11px] text-orange-700">Créer un lead</span>
      </button>
    );
  }

  const vendor = slot.vendor ?? slot.vendor_code ?? "?";
  const common = "flex h-20 flex-col items-center justify-center gap-0.5 rounded-md px-2 text-center";

  return (
    <div
      title={`${slot.role} — ${vendor} (${slot.is_hws ? t.stack.hws : t.stack.rival})`}
      className={
        slot.is_hws
          ? `${common} border border-navy-500 bg-navy-100`
          : `${common} stack-hachure border border-encre-45`
      }
    >
      <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-encre-45">
        {role}
      </span>
      {/* Sur fond hachure, le texte a besoin d'un aplat pour rester lisible. */}
      <span
        className={`line-clamp-2 rounded px-1 text-[12px] font-medium leading-tight ${
          slot.is_hws ? "text-navy-700" : "bg-surface/90 text-encre-100"
        }`}
      >
        {vendor}
      </span>
      {slot.product ? (
        <span
          className={`line-clamp-1 rounded px-1 text-[10px] ${
            slot.is_hws ? "text-encre-45" : "bg-surface/90 text-encre-60"
          }`}
        >
          {slot.product}
        </span>
      ) : null}
      <span className="sr-only">{roleLong}</span>
    </div>
  );
}

function Indicator({
  label,
  children,
  tone = "neutre",
}: {
  label: string;
  children: React.ReactNode;
  tone?: "neutre" | "danger";
}) {
  return (
    <div
      className={`rounded-md border px-3 py-2 ${
        tone === "danger" ? "border-danger/30 bg-danger-fond" : "border-bordure bg-surface"
      }`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-encre-45">
        {label}
      </p>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}

export default function StackPanel({
  card,
  onNotice,
}: {
  card: PropertyCard;
  onNotice: (message: string) => void;
}) {
  const [, setTouched] = useState(0);
  const stack = slots({ stack: card.stack } as never);
  const overdue = card.overdue_renewals ?? 0;

  return (
    <section className="border-b border-bordure bg-fond px-6 py-4">
      <div className="grid grid-cols-8 gap-2">
        {stack.map((slot) => (
          <StackCard
            key={slot.role}
            slot={slot}
            onEmptyClick={() => {
              setTouched((n) => n + 1);
              onNotice(
                `Rôle ${slot.role} libre sur ${card.code} : la création de lead arrivera avec l'écran dédié.`,
              );
            }}
          />
        ))}
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2">
        <Indicator label="Rôles couverts">
          <span className="font-mono text-[15px] tabular-nums text-encre-100">
            {card.roles_covered ?? 0}/{card.roles_total ?? 8}
          </span>
          <span className="ml-2 text-[11px] text-encre-45">
            dont {card.roles_hws ?? 0} HWS
          </span>
        </Indicator>

        {overdue > 0 ? (
          <Indicator label="Échéances dépassées" tone="danger">
            <span className="font-mono text-[15px] tabular-nums text-danger">{overdue}</span>
            {card.overdue_since_days !== null ? (
              <span className="ml-2 text-[11px] text-danger">
                {t.renewal.overdue(Math.abs(card.overdue_since_days))}
              </span>
            ) : null}
            {card.oldest_overdue_date ? (
              <p className="mt-0.5 font-mono text-[11px] text-danger">
                depuis le {formatDate(card.oldest_overdue_date)}
              </p>
            ) : null}
          </Indicator>
        ) : (
          <Indicator label="Prochain renouvellement">
            {card.next_renewal_date ? (
              <>
                <span className="font-mono text-[15px] tabular-nums text-encre-100">
                  {formatDate(card.next_renewal_date)}
                </span>
                {card.next_renewal_in_days !== null ? (
                  <span className="ml-2 font-mono text-[11px] text-encre-60">
                    {t.renewal.inDays(card.next_renewal_in_days)}
                  </span>
                ) : null}
              </>
            ) : (
              <span className="text-[13px] italic text-encre-45">{t.renewal.toFill}</span>
            )}
          </Indicator>
        )}

        <Indicator label="Dossiers Go Siyaha">
          <span className="font-mono text-[15px] tabular-nums text-encre-100">
            {card.gosiyaha_dossiers ?? 0}
          </span>
        </Indicator>

        <Indicator label="Présence en ligne">
          {/* Un score sans sa date ne veut rien dire : on ne l'affiche pas. */}
          {card.online_presence_date && card.online_presence_score !== null ? (
            <>
              <span className="font-mono text-[15px] tabular-nums text-encre-100">
                {card.online_presence_score}
              </span>
              <span className="ml-2 font-mono text-[11px] text-encre-45">
                au {formatDate(card.online_presence_date)}
              </span>
            </>
          ) : (
            <>
              <span className="text-[13px] text-encre-45">Non calculé</span>
              <button
                type="button"
                onClick={() =>
                  onNotice(`Audit de présence en ligne à lancer pour ${card.code}.`)
                }
                className="ml-2 text-[11px] text-navy-500 underline underline-offset-2 hover:text-navy-700"
              >
                lancer un audit
              </button>
            </>
          )}
        </Indicator>
      </div>
    </section>
  );
}
