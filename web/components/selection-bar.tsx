"use client";

import { t } from "@/lib/i18n";

export default function SelectionBar({
  count,
  totalFiltered,
  onSelectAllFiltered,
  onClear,
  onSetRenewal,
  onAssignProject,
  onExport,
}: {
  count: number;
  totalFiltered: number;
  onSelectAllFiltered: () => void;
  onClear: () => void;
  onSetRenewal: () => void;
  onAssignProject: () => void;
  onExport: () => void;
}) {
  const action =
    "rounded-md border border-navy-400 bg-navy-700 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-navy-600";

  return (
    <div className="shrink-0 border-t border-navy-700 bg-navy-900 px-6 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-[13px] text-white">
          <span className="font-mono tabular-nums">{count}</span>{" "}
          {count > 1 ? t.selection.countMany : t.selection.countOne}
        </p>

        {count < totalFiltered ? (
          <button
            type="button"
            onClick={onSelectAllFiltered}
            className="text-[12px] text-navy-300 underline underline-offset-2 hover:text-white"
          >
            {t.selection.selectAllFiltered(totalFiltered)}
          </button>
        ) : null}

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button type="button" onClick={onSetRenewal} className={action}>
            {t.selection.setRenewal}
          </button>
          <button type="button" onClick={onAssignProject} className={action}>
            {t.selection.assignProject}
          </button>
          <button type="button" onClick={onExport} className={action}>
            {t.selection.export}
          </button>
          <button
            type="button"
            onClick={onClear}
            className="rounded-md px-3 py-1.5 text-[12px] text-navy-300 hover:text-white"
          >
            {t.selection.clear}
          </button>
        </div>
      </div>
    </div>
  );
}
