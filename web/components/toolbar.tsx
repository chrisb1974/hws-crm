"use client";

import type { RefObject } from "react";
import { t } from "@/lib/i18n";
import { StackLegend } from "@/components/stack-sketch";
import {
  SAVED_VIEWS,
  activeFilterCount,
  EMPTY_FILTERS,
  type FacetOption,
  type Facets,
  type Filters,
  type SavedViewId,
} from "@/lib/property-list";

function FilterSelect({
  label,
  value,
  options,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  options: FacetOption[];
  placeholder: string;
  onChange: (value: string) => void;
}) {
  const active = value !== "";
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-encre-45">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`h-8 min-w-[8.5rem] max-w-[11rem] rounded-md border px-2 text-[12px] ${
          active
            ? "border-navy-500 bg-navy-100 font-medium text-navy-700"
            : "border-bordure-forte bg-surface text-encre-75"
        }`}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function Toolbar({
  view,
  viewCounts,
  onViewChange,
  query,
  onQueryChange,
  searchRef,
  filters,
  onFiltersChange,
  facets,
}: {
  view: SavedViewId;
  viewCounts: Record<SavedViewId, number>;
  onViewChange: (view: SavedViewId) => void;
  query: string;
  onQueryChange: (query: string) => void;
  searchRef: RefObject<HTMLInputElement | null>;
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  facets: Facets;
}) {
  const filtersActive = activeFilterCount(filters);
  const set = (patch: Partial<Filters>) => onFiltersChange({ ...filters, ...patch });

  return (
    <div className="shrink-0 border-b border-bordure bg-surface px-6 pb-3 pt-4">
      {/* Vues enregistrees — le coeur de l'outil. */}
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Vues enregistrées">
        {SAVED_VIEWS.map((savedView) => {
          const selected = savedView.id === view;
          return (
            <button
              key={savedView.id}
              type="button"
              onClick={() => onViewChange(savedView.id)}
              aria-pressed={selected}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] transition-colors ${
                selected
                  ? "border-navy-500 bg-navy-500 text-white"
                  : "border-bordure-forte bg-surface text-encre-75 hover:border-navy-300 hover:text-navy-700"
              }`}
            >
              {savedView.label}
              <span
                className={`font-mono text-[11px] tabular-nums ${
                  selected ? "text-navy-200" : "text-encre-45"
                }`}
              >
                {viewCounts[savedView.id]}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="flex flex-1 flex-col gap-1" style={{ minWidth: "18rem" }}>
          <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-encre-45">
            {t.list.searchLabel}
          </span>
          <span className="relative flex items-center">
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder={t.list.searchPlaceholder}
              className="h-8 w-full rounded-md border border-bordure-forte bg-surface pl-2.5 pr-9 text-[13px] text-encre-100 placeholder:text-encre-30 focus:border-navy-500"
            />
            <kbd
              aria-hidden="true"
              className="pointer-events-none absolute right-2 rounded border border-bordure-forte bg-fond px-1.5 font-mono text-[10px] text-encre-45"
            >
              {t.list.searchHint}
            </kbd>
          </span>
        </label>

        <FilterSelect
          label={t.filters.country}
          value={filters.country}
          options={facets.countries}
          placeholder={t.filters.all}
          onChange={(country) => set({ country })}
        />
        <FilterSelect
          label={t.filters.city}
          value={filters.city}
          options={facets.cities}
          placeholder={t.filters.allF}
          onChange={(city) => set({ city })}
        />
        <FilterSelect
          label={t.filters.type}
          value={filters.propertyType}
          options={facets.types}
          placeholder={t.filters.all}
          onChange={(propertyType) => set({ propertyType })}
        />
        <FilterSelect
          label={t.filters.status}
          value={filters.status}
          options={facets.statuses}
          placeholder={t.filters.all}
          onChange={(status) => set({ status })}
        />
        <FilterSelect
          label={t.filters.vendor}
          value={filters.vendor}
          options={facets.vendors}
          placeholder={t.filters.all}
          onChange={(vendor) => set({ vendor })}
        />
        <FilterSelect
          label={t.filters.missingRole}
          value={filters.missingRole}
          options={facets.missingRoles}
          placeholder={t.filters.all}
          onChange={(missingRole) => set({ missingRole })}
        />
        <FilterSelect
          label={t.filters.owner}
          value={filters.owner}
          options={facets.owners}
          placeholder={t.filters.all}
          onChange={(owner) => set({ owner })}
        />

        <button
          type="button"
          onClick={() => {
            onFiltersChange(EMPTY_FILTERS);
            onQueryChange("");
          }}
          disabled={filtersActive === 0 && query === ""}
          className="h-8 rounded-md border border-bordure-forte bg-surface px-3 text-[12px] text-encre-75 hover:border-navy-300 hover:text-navy-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t.list.clearFilters}
          {filtersActive > 0 ? (
            <span className="ml-1 font-mono text-[11px] tabular-nums text-navy-500">
              {filtersActive}
            </span>
          ) : null}
        </button>

        <div className="ml-auto pb-1">
          <StackLegend />
        </div>
      </div>
    </div>
  );
}
