"use client";

import { t } from "@/lib/i18n";
import { STACK_ROLES, type StackSlot } from "@/lib/types";
import { vendorAbbreviation } from "@/lib/vendors";

/**
 * Croquis du stack — element signature de l'ecran.
 *
 * Huit cases de largeur fixe, une par role, dans l'ordre de l'enum
 * `stack_role`. La grille est identique d'une ligne a l'autre : en faisant
 * defiler, une colonne vide sur tout le portefeuille se voit d'un coup d'oeil.
 */

const GRID = "grid grid-cols-[repeat(8,24px)] gap-[3px]";

export function StackHeader() {
  return (
    <div className={GRID} aria-hidden="true">
      {STACK_ROLES.map((role) => (
        <span
          key={role}
          className="text-center text-[9px] font-semibold uppercase tracking-[0.02em] text-encre-45"
        >
          {t.roles[role]}
        </span>
      ))}
    </div>
  );
}

function cellTitle(slot: StackSlot): string {
  if (!slot.filled) return `${slot.role} — ${t.stack.empty}`;
  const vendor = slot.vendor ?? slot.vendor_code ?? "?";
  return `${slot.role} — ${vendor} (${slot.is_hws ? t.stack.hws : t.stack.rival})`;
}

function StackCell({ slot }: { slot: StackSlot }) {
  const label = cellTitle(slot);

  if (!slot.filled) {
    return (
      <span
        title={label}
        aria-label={label}
        className="flex h-5 items-center justify-center rounded-[3px] border border-dashed border-bordure-forte"
      />
    );
  }

  const abbreviation = vendorAbbreviation(slot.vendor_code);

  if (slot.is_hws) {
    return (
      <span
        title={label}
        aria-label={label}
        className="flex h-5 items-center justify-center rounded-[3px] border border-navy-500 bg-navy-100 font-mono text-[9px] font-semibold leading-none text-navy-700"
      >
        {abbreviation}
      </span>
    );
  }

  return (
    <span
      title={label}
      aria-label={label}
      className="stack-hachure flex h-5 items-center justify-center rounded-[3px] border border-encre-45 font-mono text-[9px] font-semibold leading-none text-encre-75"
    >
      {abbreviation}
    </span>
  );
}

export default function StackSketch({ stack }: { stack: StackSlot[] }) {
  return (
    <div className={GRID} role="group">
      {stack.map((slot) => (
        <StackCell key={slot.role} slot={slot} />
      ))}
    </div>
  );
}

export function StackLegend() {
  return (
    <div className="flex items-center gap-4 text-[11px] text-encre-60">
      <span className="flex items-center gap-1.5">
        <span className="h-3.5 w-6 rounded-[3px] border border-navy-500 bg-navy-100" />
        {t.stack.legendHws}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="stack-hachure h-3.5 w-6 rounded-[3px] border border-encre-45" />
        {t.stack.legendRival}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-3.5 w-6 rounded-[3px] border border-dashed border-bordure-forte" />
        {t.stack.legendEmpty}
      </span>
    </div>
  );
}
