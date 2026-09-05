"use client";

import { useEffect, useState } from "react";
import PropertyHeader from "@/components/fiche/property-header";
import StackPanel from "@/components/fiche/stack-panel";
import FicheTabs from "@/components/fiche/tabs";
import type { References } from "@/app/etablissements/[code]/actions";
import type { EditableField, EditableValues, PropertyCard } from "@/lib/property-card";

/**
 * Etat client unique des valeurs modifiables : l'en-tete et l'onglet
 * Informations lisent la meme source, une saisie se repercute partout sans
 * rechargement.
 */
export default function FicheClient({
  card,
  initialValues,
  references,
  backHref,
}: {
  card: PropertyCard;
  initialValues: EditableValues;
  references: References;
  backHref: string;
}) {
  const [values, setValues] = useState<EditableValues>(initialValues);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 6000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  function change(key: EditableField, next: string | number | null) {
    setValues((current) => ({ ...current, [key]: next }));
  }

  const ownerLabels = {
    sales: references.app_user.find((o) => o.value === values.sales_owner)?.label
      ?? card.sales_owner_name,
    csm: references.app_user.find((o) => o.value === values.csm_owner)?.label
      ?? card.csm_owner_name,
    group: references.hotel_group.find((o) => o.value === values.group_id)?.label
      ?? card.group_name,
    legal: references.legal_entity.find((o) => o.value === values.legal_entity_id)?.label
      ?? card.legal_name,
  };

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <PropertyHeader
        card={card}
        values={values}
        ownerLabels={ownerLabels}
        backHref={backHref}
      />
      <StackPanel card={card} onNotice={setNotice} />
      <FicheTabs card={card} values={values} references={references} onChange={change} />

      {notice ? (
        <p
          role="status"
          className="fixed bottom-6 right-6 z-40 max-w-sm rounded-md border border-bordure-forte bg-surface px-4 py-3 text-[13px] text-encre-100 shadow-[0_4px_16px_rgba(14,23,59,0.16)]"
        >
          {notice}
        </p>
      ) : null}
    </div>
  );
}
