"use client";

import { useEffect, useRef, useState } from "react";
import { updatePropertyField, type Option } from "@/app/etablissements/[code]/actions";
import { normalizeFieldValue, type FieldSpec } from "@/lib/property-card";
import { t } from "@/lib/i18n";

type Status = "idle" | "saving" | "saved" | "error";

/**
 * Edition en ligne, sans mode edition.
 *
 * Champs libres : un clic transforme la valeur en champ, Entree ou la perte de
 * focus enregistre, Echap annule.
 * Listes fermees (enum, referentiels) : le controle est deja un <select>, un
 * seul clic ouvre le menu. Deux gestes maximum dans tous les cas.
 */
export default function EditableField({
  spec,
  propertyId,
  value,
  optionLabel,
  options,
  onChange,
}: {
  spec: FieldSpec;
  propertyId: string;
  value: string | number | null;
  /** Libelle a afficher pour une cle etrangere (le brut est un uuid). */
  optionLabel?: string | null;
  options?: Option[];
  onChange: (next: string | number | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  const isList = spec.kind === "enum" || spec.kind === "reference";
  const text = value === null || value === undefined ? "" : String(value);

  useEffect(() => {
    if (status !== "saved") return;
    const timer = window.setTimeout(() => setStatus("idle"), 1200);
    return () => window.clearTimeout(timer);
  }, [status]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  async function commit(raw: string) {
    const previous = value;
    const normalized = normalizeFieldValue(spec.key, raw);
    if ("error" in normalized) {
      setStatus("error");
      setMessage(normalized.error);
      return;
    }
    if (normalized.value === previous) {
      setStatus("idle");
      setMessage("");
      return;
    }

    // Mise a jour optimiste : la valeur s'affiche avant la reponse du serveur.
    onChange(normalized.value);
    setStatus("saving");
    setMessage("");

    const result = await updatePropertyField(propertyId, spec.key, raw);
    if (result.ok) {
      setStatus(result.warning ? "error" : "saved");
      if (result.warning) setMessage(result.warning);
      return;
    }
    // Echec : retour a l'etat precedent, message explicite.
    onChange(previous);
    setStatus("error");
    setMessage(result.message);
  }

  const feedback =
    status === "saving" ? (
      <span className="text-[11px] text-encre-45">enregistrement…</span>
    ) : status === "saved" ? (
      <span className="text-[11px] text-ok">enregistré</span>
    ) : status === "error" ? (
      <span role="alert" className="text-[11px] text-danger">
        {message}
      </span>
    ) : null;

  if (isList) {
    const list = spec.kind === "enum"
      ? (spec.values ?? []).map((v) => ({ value: v, label: t.lifecycle[v] ?? v }))
      : (options ?? []);
    const known = list.some((o) => o.value === text);

    return (
      <Row spec={spec} feedback={feedback}>
        <select
          value={text}
          onChange={(event) => commit(event.target.value)}
          className="-ml-1 w-full max-w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-[13px] text-encre-100 hover:border-bordure-forte hover:bg-surface focus:border-navy-500 focus:bg-surface"
        >
          <option value="">Ajouter</option>
          {/* Valeur presente en base mais absente du referentiel visible :
              on la garde, sinon un simple affichage l'effacerait. */}
          {!known && text ? <option value={text}>{optionLabel ?? text}</option> : null}
          {list.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </Row>
    );
  }

  if (editing) {
    const shared = {
      ref: inputRef as never,
      value: draft,
      onChange: (e: { target: { value: string } }) => setDraft(e.target.value),
      onBlur: () => {
        setEditing(false);
        void commit(draft);
      },
      onKeyDown: (event: React.KeyboardEvent) => {
        if (event.key === "Enter" && spec.kind !== "textarea") {
          event.preventDefault();
          setEditing(false);
          void commit(draft);
        }
        if (event.key === "Escape") {
          event.preventDefault();
          setEditing(false);
          setDraft(text);
          setStatus("idle");
          setMessage("");
        }
      },
      className:
        "w-full rounded border border-navy-500 bg-surface px-1.5 py-0.5 text-[13px] text-encre-100 focus:outline-none",
      placeholder: spec.placeholder,
    };

    return (
      <Row spec={spec} feedback={feedback}>
        {spec.kind === "textarea" ? (
          <textarea {...shared} rows={2} />
        ) : (
          <input {...shared} inputMode={spec.kind === "integer" ? "numeric" : undefined} />
        )}
      </Row>
    );
  }

  return (
    <Row spec={spec} feedback={feedback}>
      <span className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => {
            setDraft(text);
            setEditing(true);
          }}
          className={`-ml-1 max-w-full truncate rounded border border-transparent px-1 py-0.5 text-left text-[13px] hover:border-bordure-forte hover:bg-surface ${
            text
              ? spec.kind === "integer"
                ? "font-mono tabular-nums text-encre-100"
                : "text-encre-100"
              : "text-encre-30"
          }`}
          title={text || undefined}
        >
          {/* Regle de fond : un vide se declare. */}
          {text || "Ajouter"}
        </button>
        {spec.kind === "url" && text ? (
          <a
            href={text}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 text-[11px] text-navy-500 underline underline-offset-2 hover:text-navy-700"
            aria-label={`Ouvrir ${spec.label}`}
          >
            ouvrir
          </a>
        ) : null}
      </span>
    </Row>
  );
}

function Row({
  spec,
  feedback,
  children,
}: {
  spec: FieldSpec;
  feedback: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[150px_minmax(0,1fr)] items-start gap-3 py-1.5">
      <div className="pt-1">
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-encre-45">
          {spec.label}
        </span>
        {spec.hint ? (
          <span className="mt-0.5 block text-[10px] text-orange-700">{spec.hint}</span>
        ) : null}
      </div>
      <div className="min-w-0">
        {children}
        {feedback ? <div className="mt-0.5">{feedback}</div> : null}
      </div>
    </div>
  );
}

/** Valeur derivee : affichee comme telle, insensible au clic. */
export function ComputedField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[150px_minmax(0,1fr)] items-start gap-3 py-1.5">
      <span className="pt-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-encre-45">
        {label}
      </span>
      <div className="min-w-0">
        <span className="text-[13px] text-encre-75">{children}</span>
        <span className="ml-2 align-middle text-[9px] font-semibold uppercase tracking-[0.1em] text-encre-30">
          calculé
        </span>
      </div>
    </div>
  );
}
