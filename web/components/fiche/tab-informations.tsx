"use client";

import { useState } from "react";
import EditableField, { ComputedField } from "@/components/fiche/editable-field";
import type { References } from "@/app/etablissements/[code]/actions";
import {
  BLOCKS,
  FIELD_SPECS,
  type EditableField as FieldKey,
  type EditableValues,
  type PropertyCard,
} from "@/lib/property-card";
import { t } from "@/lib/i18n";

function formatDate(value: string | null): string {
  if (!value) return "—";
  const [y, m, d] = value.slice(0, 10).split("-");
  return y && m && d ? `${d}/${m}/${y}` : value;
}

export default function TabInformations({
  card,
  values,
  references,
  propertyId,
  onChange,
}: {
  card: PropertyCard;
  values: EditableValues;
  references: References;
  propertyId: string;
  onChange: (key: FieldKey, next: string | number | null) => void;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const computed: Record<string, React.ReactNode> = {
    identite: (
      <>
        <ComputedField label="Rôles couverts">
          <span className="font-mono tabular-nums">
            {card.roles_covered ?? 0}/{card.roles_total ?? 8}
          </span>
        </ComputedField>
        <ComputedField label="Abonnements actifs">
          <span className="font-mono tabular-nums">{card.active_subscriptions ?? 0}</span>
        </ComputedField>
      </>
    ),
    presence: (
      <ComputedField label="Score de présence">
        {card.online_presence_date && card.online_presence_score !== null ? (
          <span className="font-mono tabular-nums">
            {card.online_presence_score} au {formatDate(card.online_presence_date)}
          </span>
        ) : (
          <span className="italic text-encre-45">Non calculé</span>
        )}
      </ComputedField>
    ),
    relation: (
      <>
        <ComputedField label="Prochain renouvellement">
          {card.next_renewal_date ? (
            <span className="font-mono tabular-nums">{formatDate(card.next_renewal_date)}</span>
          ) : (
            <span className="italic text-encre-45">{t.renewal.toFill}</span>
          )}
        </ComputedField>
        <ComputedField label="Première activation">
          <span className="font-mono tabular-nums">{formatDate(card.first_activation_date)}</span>
        </ComputedField>
        <ComputedField label="Dossiers Go Siyaha">
          <span className="font-mono tabular-nums">{card.gosiyaha_dossiers ?? 0}</span>
        </ComputedField>
      </>
    ),
  };

  /** Libellé lisible d'une clé étrangère déjà enregistrée. */
  function labelFor(key: FieldKey): string | null {
    if (key === "sales_owner") return card.sales_owner_name;
    if (key === "csm_owner") return card.csm_owner_name;
    if (key === "group_id") return card.group_name;
    if (key === "legal_entity_id") return card.legal_name;
    return null;
  }

  return (
    <div className="grid grid-cols-1 gap-4 px-6 py-5 xl:grid-cols-2">
      {BLOCKS.map((block) => {
        const all = FIELD_SPECS.filter((spec) => spec.block === block.id);
        const common = all.filter((spec) => !spec.rare);
        const rare = all.filter((spec) => spec.rare);
        const open = expanded[block.id] ?? false;

        return (
          <section
            key={block.id}
            className="rounded-lg border border-bordure bg-surface px-4 py-3"
          >
            <h2 className="mb-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-navy-700">
              {block.label}
            </h2>

            {common.map((spec) => (
              <EditableField
                key={spec.key}
                spec={spec}
                propertyId={propertyId}
                value={values[spec.key]}
                optionLabel={labelFor(spec.key)}
                options={spec.reference ? references[spec.reference] : undefined}
                onChange={(next) => onChange(spec.key, next)}
              />
            ))}

            {computed[block.id] ?? null}

            {rare.length > 0 ? (
              <div className="mt-1 border-t border-bordure pt-1">
                <button
                  type="button"
                  onClick={() => setExpanded((s) => ({ ...s, [block.id]: !open }))}
                  className="text-[11px] text-navy-500 underline underline-offset-2 hover:text-navy-700"
                >
                  {open
                    ? "Masquer les champs rarement utilisés"
                    : `Afficher ${rare.length} champ${rare.length > 1 ? "s" : ""} rarement utilisé${rare.length > 1 ? "s" : ""}`}
                </button>
                {open
                  ? rare.map((spec) => (
                      <EditableField
                        key={spec.key}
                        spec={spec}
                        propertyId={propertyId}
                        value={values[spec.key]}
                        optionLabel={labelFor(spec.key)}
                        options={spec.reference ? references[spec.reference] : undefined}
                        onChange={(next) => onChange(spec.key, next)}
                      />
                    ))
                  : null}
              </div>
            ) : null}

            {block.id === "relation" && references.usersRestricted ? (
              <p className="mt-2 rounded border border-alerte/30 bg-alerte-fond px-2 py-1.5 text-[11px] text-alerte">
                La politique RLS <span className="font-mono">app_user_select</span> ne laisse
                voir que votre propre compte : les listes Commercial et Client success
                resteront incomplètes tant que votre rôle n&apos;est pas <em>admin</em>.
              </p>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
