"use client";

import { useRef, type KeyboardEvent } from "react";
import Highlight from "@/components/highlight";
import StackSketch, { StackHeader } from "@/components/stack-sketch";
import { Empty, OverdueCell, RenewalCell, RolesCovered, StatusChip } from "@/components/cells";
import { t } from "@/lib/i18n";
import type { Sort, SortKey } from "@/lib/property-list";
import { slots, type PropertyRow } from "@/lib/types";

const HEAD_CELL =
  "sticky top-0 z-10 border-b border-bordure-forte bg-surface px-2 py-2 text-left align-bottom text-[10px] font-semibold uppercase tracking-[0.08em] text-encre-60";
const CELL = "border-b border-bordure px-2 py-1.5 align-middle";

function SortButton({
  label,
  sortKey,
  sort,
  onSort,
  align = "left",
}: {
  label: string;
  sortKey: SortKey;
  sort: Sort;
  onSort: (key: SortKey) => void;
  align?: "left" | "right";
}) {
  const active = sort.key === sortKey;
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={`flex w-full items-center gap-1 uppercase tracking-[0.08em] ${
        align === "right" ? "justify-end" : ""
      } ${active ? "text-navy-700" : "text-encre-60 hover:text-navy-500"}`}
    >
      {label}
      <span aria-hidden="true" className={active ? "text-navy-500" : "text-encre-30"}>
        {active ? (sort.direction === "asc" ? "▲" : "▼") : "↕"}
      </span>
    </button>
  );
}

function ariaSort(sort: Sort, key: SortKey): "ascending" | "descending" | "none" {
  if (sort.key !== key) return "none";
  return sort.direction === "asc" ? "ascending" : "descending";
}

export default function PropertyTable({
  rows,
  query,
  sort,
  onSort,
  selected,
  onToggle,
  onToggleAll,
  showOverdue,
}: {
  rows: PropertyRow[];
  query: string;
  sort: Sort;
  onSort: (key: SortKey) => void;
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: (checked: boolean) => void;
  /** La colonne du retard n'apparaît que dans la vue « Échéances dépassées ». */
  showOverdue: boolean;
}) {
  const bodyRef = useRef<HTMLTableSectionElement>(null);

  const selectedOnPage = rows.filter((row) => selected.has(row.id)).length;
  const allSelected = rows.length > 0 && selectedOnPage === rows.length;
  const partial = selectedOnPage > 0 && !allSelected;

  /** Navigation clavier dans le tableau : flèches pour se déplacer,
   *  espace pour cocher la ligne focalisée. */
  function onRowKeyDown(event: KeyboardEvent<HTMLTableRowElement>, id: string) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const all = Array.from(bodyRef.current?.querySelectorAll("tr") ?? []);
      const index = all.indexOf(event.currentTarget);
      const next = all[index + (event.key === "ArrowDown" ? 1 : -1)];
      next?.focus();
      return;
    }
    if (event.key === " " || event.key === "Spacebar") {
      event.preventDefault();
      onToggle(id);
    }
  }

  return (
    <table className={`w-full table-fixed border-separate border-spacing-0 text-[13px] ${
        showOverdue ? "min-w-[1328px]" : "min-w-[1208px]"
      }`}>
      <colgroup>
        <col style={{ width: "32px" }} />
        <col style={{ width: "88px" }} />
        {/* Établissement : prend la largeur restante (table-fixed). */}
        <col />
        <col style={{ width: "88px" }} />
        <col style={{ width: "84px" }} />
        <col style={{ width: "76px" }} />
        <col style={{ width: "120px" }} />
        <col style={{ width: "229px" }} />
        <col style={{ width: "58px" }} />
        <col style={{ width: "136px" }} />
        {showOverdue ? <col style={{ width: "120px" }} /> : null}
        <col style={{ width: "120px" }} />
      </colgroup>

      <thead>
        <tr>
          <th scope="col" className={`${HEAD_CELL} pl-3 pr-0`}>
            <input
              type="checkbox"
              checked={allSelected}
              ref={(node) => {
                if (node) node.indeterminate = partial;
              }}
              onChange={(event) => onToggleAll(event.target.checked)}
              aria-label={t.columns.select}
              className="size-3.5 accent-navy-500 align-middle"
            />
          </th>
          <th scope="col" className={HEAD_CELL} aria-sort={ariaSort(sort, "code")}>
            <SortButton label={t.columns.code} sortKey="code" sort={sort} onSort={onSort} />
          </th>
          <th scope="col" className={HEAD_CELL} aria-sort={ariaSort(sort, "name")}>
            <SortButton label={t.columns.property} sortKey="name" sort={sort} onSort={onSort} />
          </th>
          <th scope="col" className={HEAD_CELL} aria-sort={ariaSort(sort, "city")}>
            <SortButton label={t.columns.city} sortKey="city" sort={sort} onSort={onSort} />
          </th>
          <th scope="col" className={HEAD_CELL}>
            {t.columns.type}
          </th>
          <th scope="col" className={HEAD_CELL} aria-sort={ariaSort(sort, "rooms_total")}>
            <SortButton
              label={t.columns.rooms}
              sortKey="rooms_total"
              sort={sort}
              onSort={onSort}
              align="right"
            />
          </th>
          <th scope="col" className={HEAD_CELL} aria-sort={ariaSort(sort, "lifecycle_status")}>
            <SortButton
              label={t.columns.status}
              sortKey="lifecycle_status"
              sort={sort}
              onSort={onSort}
            />
          </th>
          <th scope="col" className={HEAD_CELL}>
            <span className="mb-1 block">{t.columns.stack}</span>
            <StackHeader />
          </th>
          <th scope="col" className={HEAD_CELL} aria-sort={ariaSort(sort, "roles_covered")}>
            <SortButton
              label={t.columns.rolesCovered}
              sortKey="roles_covered"
              sort={sort}
              onSort={onSort}
            />
          </th>
          <th
            scope="col"
            className={HEAD_CELL}
            aria-sort={ariaSort(sort, "next_renewal_in_days")}
          >
            <SortButton
              label={t.columns.renewal}
              sortKey="next_renewal_in_days"
              sort={sort}
              onSort={onSort}
            />
          </th>
          {showOverdue ? (
            <th
              scope="col"
              className={HEAD_CELL}
              aria-sort={ariaSort(sort, "overdue_since_days")}
            >
              <SortButton
                label={t.columns.overdue}
                sortKey="overdue_since_days"
                sort={sort}
                onSort={onSort}
              />
            </th>
          ) : null}
          <th scope="col" className={`${HEAD_CELL} pr-3`}>
            {t.columns.owner}
          </th>
        </tr>
      </thead>

      <tbody ref={bodyRef}>
        {rows.map((row) => {
          const isSelected = selected.has(row.id);
          return (
            <tr
              key={row.id}
              tabIndex={0}
              aria-selected={isSelected}
              onKeyDown={(event) => onRowKeyDown(event, row.id)}
              className={`border-b border-bordure ${
                isSelected ? "bg-navy-100" : "bg-surface hover:bg-fond"
              }`}
            >
              <td className="border-b border-bordure py-1.5 pl-3 align-middle">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggle(row.id)}
                  aria-label={`${t.columns.select} ${row.code}`}
                  className="size-3.5 accent-navy-500 align-middle"
                />
              </td>

              <td className={CELL}>
                <span className="whitespace-nowrap font-mono text-[12px] text-encre-75">
                  <Highlight text={row.code} query={query} />
                </span>
              </td>

              <td className={CELL}>
                <span className="block truncate font-medium leading-tight text-encre-100" title={row.name}>
                  <Highlight text={row.name} query={query} />
                </span>
                {row.group_name ? (
                  <span
                    className="block truncate text-[11px] leading-tight text-encre-45"
                    title={row.group_name}
                  >
                    <Highlight text={row.group_name} query={query} />
                  </span>
                ) : null}
              </td>

              <td className={CELL}>
                <span className="block truncate text-encre-75" title={row.city ?? ""}>
                  {row.city ? <Highlight text={row.city} query={query} /> : <Empty />}
                </span>
                {row.country ? (
                  <span className="font-mono text-[11px] text-encre-45">{row.country}</span>
                ) : null}
              </td>

              <td className={`${CELL} text-[12px] text-encre-75`}>
                {row.property_type ? (
                  <span className="block truncate" title={row.property_type}>
                    {row.property_type}
                  </span>
                ) : (
                  <Empty />
                )}
              </td>

              <td className={`${CELL} text-right`}>
                {row.rooms_total === null ? (
                  <Empty />
                ) : (
                  <span className="font-mono text-[12px] tabular-nums text-encre-100">
                    {row.rooms_total}
                  </span>
                )}
              </td>

              <td className={CELL}>
                <StatusChip status={row.lifecycle_status} />
              </td>

              <td className={CELL}>
                <StackSketch stack={slots(row)} />
              </td>

              <td className={CELL}>
                <RolesCovered covered={row.roles_covered} total={row.roles_total} />
              </td>

              <td className={CELL}>
                <RenewalCell date={row.next_renewal_date} days={row.next_renewal_in_days} />
              </td>

              {showOverdue ? (
                <td className={CELL}>
                  <OverdueCell days={row.overdue_since_days} />
                </td>
              ) : null}

              <td className={`${CELL} pr-3 text-[12px] text-encre-75`}>
                {row.sales_owner_name ? (
                  <span className="block truncate" title={row.sales_owner_name}>
                    {row.sales_owner_name}
                  </span>
                ) : (
                  <Empty label={t.renewal.toFill} />
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
