"use client";

import { useRef, useState } from "react";
import TabInformations from "@/components/fiche/tab-informations";
import { Cell, EmptyTab, TableShell, date, documentsWarning, text } from "@/components/fiche/tab-panels";
import {
  loadContacts,
  loadDocuments,
  loadGosiyaha,
  loadHistory,
  loadProjects,
  loadSubscriptions,
  type References,
  type TabRows,
} from "@/app/etablissements/[code]/actions";
import type { EditableField, EditableValues, PropertyCard } from "@/lib/property-card";

type TabId =
  | "informations" | "abonnements" | "gosiyaha" | "contacts"
  | "projets" | "documents" | "historique";

type Row = Record<string, unknown>;

export default function FicheTabs({
  card,
  values,
  references,
  onChange,
}: {
  card: PropertyCard;
  values: EditableValues;
  references: References;
  onChange: (key: EditableField, next: string | number | null) => void;
}) {
  const [active, setActive] = useState<TabId>("informations");
  const [cache, setCache] = useState<Partial<Record<TabId, TabRows>>>({});
  const [loading, setLoading] = useState<TabId | null>(null);

  // Chaque onglet charge son contenu a l'ouverture, une seule fois, et depuis
  // le gestionnaire de clic : rien ne se declenche avant que l'onglet soit
  // demande.
  const requested = useRef<Set<TabId>>(new Set());

  async function open(tab: TabId) {
    setActive(tab);
    if (tab === "informations" || requested.current.has(tab)) return;
    requested.current.add(tab);
    setLoading(tab);
    const result =
      tab === "abonnements" ? await loadSubscriptions(card.code)
      : tab === "gosiyaha" ? await loadGosiyaha(card.code)
      : tab === "contacts" ? await loadContacts(card.id)
      : tab === "projets" ? await loadProjects(card.id)
      : tab === "documents" ? await loadDocuments(card.id)
      : await loadHistory(card.id);
    setCache((current) => ({ ...current, [tab]: result }));
    setLoading((current) => (current === tab ? null : current));
  }

  const counts: Record<TabId, number | null> = {
    informations: null,
    abonnements: card.active_subscriptions ?? 0,
    gosiyaha: card.gosiyaha_dossiers ?? 0,
    contacts: card.contacts_count ?? 0,
    projets: card.projects?.length ?? 0,
    documents: card.documents_count ?? 0,
    historique: cache.historique?.rows.length ?? null,
  };

  const labels: Record<TabId, string> = {
    informations: "Informations",
    abonnements: "Abonnements",
    gosiyaha: "Go Siyaha",
    contacts: "Contacts",
    projets: "Projets",
    documents: "Documents",
    historique: "Historique",
  };

  const rows = cache[active]?.rows ?? [];
  const error = cache[active]?.error ?? null;

  return (
    <div className="flex flex-col">
      <div role="tablist" className="flex shrink-0 gap-1 border-b border-bordure bg-surface px-6">
        {(Object.keys(labels) as TabId[]).map((tab) => {
          const selected = tab === active;
          return (
            <button
              key={tab}
              role="tab"
              type="button"
              aria-selected={selected}
              onClick={() => void open(tab)}
              className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-[13px] ${
                selected
                  ? "border-navy-500 font-medium text-navy-700"
                  : "border-transparent text-encre-60 hover:text-navy-500"
              }`}
            >
              {labels[tab]}
              {counts[tab] !== null ? (
                <span
                  className={`font-mono text-[11px] tabular-nums ${
                    selected ? "text-navy-500" : "text-encre-30"
                  }`}
                >
                  {counts[tab]}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="bg-fond">
        {active === "informations" ? (
          <TabInformations
            card={card}
            values={values}
            references={references}
            propertyId={card.id}
            onChange={onChange}
          />
        ) : loading === active ? (
          <p className="px-6 py-10 text-[13px] text-encre-45">Chargement…</p>
        ) : error ? (
          <p role="alert" className="mx-6 my-6 rounded border border-danger/30 bg-danger-fond px-3 py-2 text-[13px] text-danger">
            {error}
          </p>
        ) : (
          <Panel tab={active} rows={rows} card={card} />
        )}
      </div>
    </div>
  );
}

function Panel({ tab, rows, card }: { tab: TabId; rows: Row[]; card: PropertyCard }) {
  if (tab === "abonnements") {
    if (rows.length === 0) {
      return (
        <EmptyTab
          title="Aucun abonnement"
          meaning="Les huit rôles du stack sont libres : c'est un portefeuille entier à équiper, pas une fiche incomplète."
        />
      );
    }
    return (
      <TableShell head={["Rôle", "Fournisseur", "Produit", "Formule", "Statut", "Activation", "Renouvellement", "Financement"]}>
        {rows.map((row, index) => (
          <tr key={index} className="bg-surface">
            <Cell mono>{text(row.role)}</Cell>
            <Cell>
              {text(row.vendor_name)}
              {row.is_partner === false ? (
                <span className="ml-1.5 text-[10px] text-encre-45">(concurrent)</span>
              ) : null}
            </Cell>
            <Cell>{text(row.product_name)}</Cell>
            <Cell>{text(row.plan_name)}</Cell>
            <Cell>{text(row.status)}</Cell>
            <Cell mono>{date(row.activation_date)}</Cell>
            <Cell mono>{date(row.renewal_date)}</Cell>
            <Cell>{text(row.funded_by)}</Cell>
          </tr>
        ))}
      </TableShell>
    );
  }

  if (tab === "gosiyaha") {
    if (rows.length === 0) {
      return (
        <EmptyTab
          title="Aucun dossier Go Siyaha"
          meaning="Aucune subvention en cours pour cet établissement."
        />
      );
    }
    return (
      <TableShell head={["Dossier", "Statut", "Phase", "Responsable", "Société", "Mise à jour"]}>
        {rows.map((row, index) => (
          <tr key={index} className="bg-surface">
            <Cell mono>{text(row.code)}</Cell>
            <Cell>{text(row.statut)}</Cell>
            <Cell>{text(row.phase)}</Cell>
            <Cell>{text(row.responsable ?? row.owner_name)}</Cell>
            <Cell>{text(row.legal_name)}</Cell>
            <Cell mono>{date(row.updated_at)}</Cell>
          </tr>
        ))}
      </TableShell>
    );
  }

  if (tab === "contacts") {
    if (rows.length === 0) {
      return (
        <EmptyTab
          title="Aucun contact"
          meaning="Sans contact, aucune alerte de renouvellement ne pourra être envoyée pour cet établissement."
        />
      );
    }
    return (
      <TableShell head={["Nom", "Fonction", "E-mail", "Téléphone", "WhatsApp", "Rôles", "Alertes"]}>
        {rows.map((row, index) => (
          <tr key={index} className="bg-surface">
            <Cell>
              {text(row.full_name)}
              {row.is_primary ? (
                <span className="ml-1.5 rounded bg-navy-100 px-1 text-[10px] text-navy-700">
                  principal
                </span>
              ) : null}
            </Cell>
            <Cell>{text(row.job_title)}</Cell>
            <Cell>
              {row.email ? (
                <a href={`mailto:${String(row.email)}`} className="text-navy-500 underline underline-offset-2">
                  {String(row.email)}
                </a>
              ) : "—"}
            </Cell>
            <Cell mono>{text(row.phone)}</Cell>
            <Cell mono>{text(row.whatsapp)}</Cell>
            <Cell>{Array.isArray(row.roles) && row.roles.length > 0 ? row.roles.join(", ") : "—"}</Cell>
            <Cell>{row.receives_alerts ? "oui" : "non"}</Cell>
          </tr>
        ))}
      </TableShell>
    );
  }

  if (tab === "projets") {
    if (rows.length === 0) {
      return (
        <EmptyTab
          title="Aucun projet"
          meaning="Cet établissement n'est rattaché à aucun programme ni opération commerciale."
        />
      );
    }
    return (
      <TableShell head={["Code", "Projet", "Type", "Statut", "Depuis"]}>
        {rows.map((row, index) => (
          <tr key={index} className="bg-surface">
            <Cell mono>{text(row.project_code)}</Cell>
            <Cell>{text(row.project_name)}</Cell>
            <Cell>{text(row.project_type)}</Cell>
            <Cell>{text(row.membership_status)}</Cell>
            <Cell mono>{date(row.since)}</Cell>
          </tr>
        ))}
      </TableShell>
    );
  }

  if (tab === "documents") {
    if (rows.length === 0) {
      return (
        <EmptyTab
          title="Aucun document"
          meaning="Rien n'est encore déposé pour cet établissement."
          warning={documentsWarning(card)}
        />
      );
    }
    return (
      <TableShell head={["Type", "Fichier", "Déposé le", "Expire le", ""]}>
        {rows.map((row, index) => (
          <tr key={index} className="bg-surface">
            <Cell mono>{text(row.type_code)}</Cell>
            <Cell>{text(row.filename)}</Cell>
            <Cell mono>{date(row.uploaded_at)}</Cell>
            <Cell mono>{date(row.expires_at)}</Cell>
            <Cell>
              {row.drive_url ? (
                <a href={String(row.drive_url)} target="_blank" rel="noreferrer" className="text-navy-500 underline underline-offset-2">
                  ouvrir
                </a>
              ) : null}
            </Cell>
          </tr>
        ))}
      </TableShell>
    );
  }

  // Historique
  if (rows.length === 0) {
    return (
      <EmptyTab
        title="Aucune modification enregistrée"
        meaning="Les modifications faites depuis cette fiche apparaîtront ici."
        warning="La policy audit_log_select_admin réserve la lecture du journal aux comptes admin : si votre rôle est sales ou support, cet onglet restera vide même après une modification."
      />
    );
  }
  return (
    <TableShell head={["Date", "Action", "Champ", "Avant", "Après"]}>
      {rows.flatMap((row, index) => {
        const before = (row.before ?? {}) as Record<string, unknown>;
        const after = (row.after ?? {}) as Record<string, unknown>;
        const keys = Object.keys(after).length > 0 ? Object.keys(after) : Object.keys(before);
        return keys.map((key) => (
          <tr key={`${index}-${key}`} className="bg-surface">
            <Cell mono>{date(row.at)}</Cell>
            <Cell>{text(row.action)}</Cell>
            <Cell mono>{key}</Cell>
            <Cell>{text(before[key], "vide")}</Cell>
            <Cell>{text(after[key], "vide")}</Cell>
          </tr>
        ));
      })}
    </TableShell>
  );
}
