"use client";

import Link from "next/link";
import Completeness from "@/components/fiche/completeness";
import { StatusChip } from "@/components/cells";
import { completeness, type EditableValues, type PropertyCard } from "@/lib/property-card";

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="text-[10px] uppercase tracking-[0.06em] text-encre-45">{label}</span>
      <span className="text-[13px] text-encre-100">{children}</span>
    </span>
  );
}

export default function PropertyHeader({
  card,
  values,
  ownerLabels,
  backHref,
}: {
  card: PropertyCard;
  values: EditableValues;
  ownerLabels: { sales: string | null; csm: string | null; group: string | null; legal: string | null };
  backHref: string;
}) {
  const { items, filled, total } = completeness(card, values);
  const city = values.city ? String(values.city) : null;
  const country = values.country ? String(values.country) : null;

  return (
    <header className="sticky top-0 z-30 border-b border-bordure bg-surface/95 px-6 py-3 backdrop-blur">
      <Link
        href={backHref}
        className="text-[12px] text-navy-500 underline underline-offset-2 hover:text-navy-700"
      >
        ← Retour à la liste
      </Link>

      <div className="mt-2 flex items-start gap-4">
        {card.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={card.logo_url}
            alt=""
            className="size-12 shrink-0 rounded border border-bordure object-contain"
          />
        ) : (
          <span className="flex size-12 shrink-0 items-center justify-center rounded border border-dashed border-bordure-forte text-center text-[9px] leading-tight text-encre-30">
            Logo
            <br />
            absent
          </span>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="text-[18px] font-semibold tracking-tight text-navy-900">
              {String(values.name ?? card.name)}
            </h1>
            <span className="font-mono text-[12px] text-encre-45">{card.code}</span>
            <StatusChip status={String(values.lifecycle_status ?? card.lifecycle_status)} />
          </div>

          <div className="mt-1.5 flex flex-wrap items-baseline gap-x-5 gap-y-1">
            {city || country ? (
              <Fact label="Lieu">
                {[city, country].filter(Boolean).join(" · ")}
              </Fact>
            ) : null}
            {values.property_type ? <Fact label="Type">{String(values.property_type)}</Fact> : null}
            {values.star_rating ? <Fact label="Catégorie">{String(values.star_rating)}</Fact> : null}
            {values.rooms_total !== null && values.rooms_total !== undefined ? (
              <Fact label="Chambres">
                <span className="font-mono tabular-nums">{String(values.rooms_total)}</span>
              </Fact>
            ) : null}
            {values.address ? (
              <Fact label="Adresse">
                <span className="max-w-[22rem] truncate align-bottom" title={String(values.address)}>
                  {String(values.address)}
                </span>
              </Fact>
            ) : null}
          </div>

          <div className="mt-1 flex flex-wrap items-baseline gap-x-5 gap-y-1">
            {values.website ? (
              <a
                href={String(values.website)}
                target="_blank"
                rel="noreferrer"
                className="text-[12px] text-navy-500 underline underline-offset-2 hover:text-navy-700"
              >
                {String(values.website).replace(/^https?:\/\//, "").replace(/\/$/, "")}
              </a>
            ) : null}
            {ownerLabels.group ? <Fact label="Groupe">{ownerLabels.group}</Fact> : null}
            {ownerLabels.legal ? <Fact label="Société">{ownerLabels.legal}</Fact> : null}
            {ownerLabels.sales ? <Fact label="Commercial">{ownerLabels.sales}</Fact> : null}
            {ownerLabels.csm ? <Fact label="Client success">{ownerLabels.csm}</Fact> : null}
          </div>
        </div>

        <Completeness items={items} filled={filled} total={total} />
      </div>
    </header>
  );
}
