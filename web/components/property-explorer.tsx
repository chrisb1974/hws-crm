"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Pagination from "@/components/pagination";
import PropertyTable from "@/components/property-table";
import SelectionBar from "@/components/selection-bar";
import Toolbar from "@/components/toolbar";
import { downloadCsv, toCsv } from "@/lib/export-csv";
import { t } from "@/lib/i18n";
import {
  PAGE_SIZE,
  SAVED_VIEWS,
  buildFacets,
  fold,
  selectRows,
  toSearchString,
  type Filters,
  type SavedViewId,
  type ListState,
  type Sort,
  type SortKey,
} from "@/lib/property-list";
import type { PropertyRow } from "@/lib/types";

export default function PropertyExplorer({
  rows,
  initialState,
}: {
  rows: PropertyRow[];
  /** Etat repris de l'URL : c'est ce qui permet de revenir d'une fiche
      sans perdre la vue, les filtres, le tri ni la page. */
  initialState: ListState;
}) {
  const [view, setView] = useState<SavedViewId>(initialState.view);
  const [filters, setFilters] = useState<Filters>(initialState.filters);
  const [query, setQuery] = useState(initialState.query);
  const [sort, setSort] = useState<Sort>(initialState.sort);
  const [page, setPage] = useState(initialState.page);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState<string | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);

  /* Compteurs des pastilles : calcules sur le portefeuille entier, donc
     independants des filtres et de la recherche en cours. */
  const viewCounts = useMemo(() => {
    const counts = {} as Record<SavedViewId, number>;
    for (const savedView of SAVED_VIEWS) {
      counts[savedView.id] = rows.filter(savedView.predicate).length;
    }
    return counts;
  }, [rows]);

  const facets = useMemo(() => buildFacets(rows), [rows]);

  /* L'URL suit l'etat, sans navigation : replaceState n'ordonne aucun rendu
     serveur et laisse le bouton « precedent » du navigateur cohérent. */
  const search = useMemo(
    () => toSearchString({ view, filters, query, sort, page: currentPageForUrl(page) }),
    [view, filters, query, sort, page],
  );

  useEffect(() => {
    const url = search ? `${window.location.pathname}?${search}` : window.location.pathname;
    window.history.replaceState(null, "", url);
  }, [search]);

  const results = useMemo(
    () => selectRows(rows, view, filters, query, sort),
    [rows, view, filters, query, sort],
  );

  const total = results.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageRows = results.slice(start, start + PAGE_SIZE);

  const foldedQuery = fold(query.trim());

  /* Un changement de perimetre remet la pagination et la selection a plat :
     une selection qui survivrait a un filtre porterait sur des lignes
     invisibles. Fait dans les gestionnaires, pas dans un effet. */
  const resetScope = useCallback(() => {
    setPage(1);
    setSelected(new Set());
  }, []);

  const changeView = useCallback(
    (next: SavedViewId) => {
      setView(next);
      resetScope();
    },
    [resetScope],
  );

  const changeFilters = useCallback(
    (next: Filters) => {
      setFilters(next);
      resetScope();
    },
    [resetScope],
  );

  const changeQuery = useCallback(
    (next: string) => {
      setQuery(next);
      resetScope();
    },
    [resetScope],
  );

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 6000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  // Raccourci « / » : focus sur la recherche, sauf si l'on est deja en train de saisir.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable === true;

      if (event.key === "/" && !typing && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
        return;
      }
      if (event.key === "Escape" && target === searchRef.current) {
        changeQuery("");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [changeQuery]);

  const onSort = useCallback((key: SortKey) => {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : // Le retard se lit du plus grave au moins grave.
          { key, direction: key === "overdue_since_days" ? "desc" : "asc" },
    );
    setPage(1);
  }, []);

  const toggle = useCallback((id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAllOnPage = useCallback(
    (checked: boolean) => {
      setSelected((current) => {
        const next = new Set(current);
        for (const row of pageRows) {
          if (checked) next.add(row.id);
          else next.delete(row.id);
        }
        return next;
      });
    },
    [pageRows],
  );

  const selectedRows = useMemo(
    () => results.filter((row) => selected.has(row.id)),
    [results, selected],
  );

  function announce(action: string) {
    setNotice(t.selection.notYet(action, selectedRows.length));
  }

  function exportSelection() {
    downloadCsv(`etablissements-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(selectedRows));
    setNotice(t.selection.exported(selectedRows.length));
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Toolbar
        view={view}
        viewCounts={viewCounts}
        onViewChange={changeView}
        query={query}
        onQueryChange={changeQuery}
        searchRef={searchRef}
        filters={filters}
        onFiltersChange={changeFilters}
        facets={facets}
      />

      <div className="min-h-0 flex-1 overflow-auto bg-surface">
        {total === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-[14px] font-medium text-encre-100">{t.list.noResult}</p>
            <p className="mt-1 text-[13px] text-encre-45">{t.list.noResultHint}</p>
          </div>
        ) : (
          <PropertyTable
            rows={pageRows}
            query={foldedQuery}
            sort={sort}
            onSort={onSort}
            selected={selected}
            onToggle={toggle}
            onToggleAll={toggleAllOnPage}
            showOverdue={view === "overdue"}
            backSearch={search}
          />
        )}
      </div>

      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-bordure bg-surface px-6 py-2">
        <p className="text-[12px] text-encre-60">
          <span className="font-mono tabular-nums text-encre-100">{total}</span>{" "}
          {total > 1 ? t.list.countMany : t.list.countOne}
        </p>
        <Pagination
          page={currentPage}
          pageCount={pageCount}
          from={total === 0 ? 0 : start + 1}
          to={Math.min(start + PAGE_SIZE, total)}
          total={total}
          onChange={(next) => setPage(Math.min(Math.max(1, next), pageCount))}
        />
      </footer>

      {selected.size > 0 ? (
        <SelectionBar
          count={selectedRows.length}
          totalFiltered={total}
          onSelectAllFiltered={() => setSelected(new Set(results.map((row) => row.id)))}
          onClear={() => setSelected(new Set())}
          onSetRenewal={() => announce(t.selection.setRenewal)}
          onAssignProject={() => announce(t.selection.assignProject)}
          onExport={exportSelection}
        />
      ) : null}

      {notice ? (
        <p
          role="status"
          className="fixed bottom-24 right-6 z-40 max-w-sm rounded-md border border-bordure-forte bg-surface px-4 py-3 text-[13px] text-encre-100 shadow-[0_4px_16px_rgba(14,23,59,0.16)]"
        >
          {notice}
        </p>
      ) : null}
    </div>
  );
}

/** La page n'est portee dans l'URL que si elle a un sens (> 1). */
function currentPageForUrl(page: number): number {
  return page > 0 ? page : 1;
}
