import type { StackSlot } from "@/lib/types";

/** Colonnes lues sur v_property_card : en-tete, croquis, indicateurs. */
export type PropertyCard = {
  id: string;
  code: string;
  name: string;
  logo_url: string | null;
  country: string | null;
  city: string | null;
  territory_code: string | null;
  address: string | null;
  property_type: string | null;
  star_rating: string | null;
  rooms_total: number | null;
  rooms_online: number | null;
  website: string | null;
  booking_engine_url: string | null;
  lifecycle_status: string;
  online_presence_score: number | null;
  online_presence_date: string | null;
  support_language: string | null;
  support_whatsapp: string | null;
  stack_surveyed_at: string | null;
  group_id: string | null;
  group_name: string | null;
  group_type: string | null;
  legal_entity_id: string | null;
  legal_name: string | null;
  ice: string | null;
  rc_number: string | null;
  billing_entity_code: string | null;
  sales_owner_name: string | null;
  csm_owner_name: string | null;
  stack: StackSlot[] | null;
  roles_covered: number | null;
  roles_total: number | null;
  roles_hws: number | null;
  roles_rival: number | null;
  next_renewal_date: string | null;
  next_renewal_in_days: number | null;
  active_subscriptions: number | null;
  first_activation_date: string | null;
  gosiyaha_dossiers: number | null;
  contacts_count: number | null;
  documents_count: number | null;
  projects: { project_code?: string; project_name?: string; status?: string; since?: string }[] | null;
  overdue_renewals: number | null;
  oldest_overdue_date: string | null;
  overdue_since_days: number | null;
  created_at: string | null;
  updated_at: string | null;
};

export const CARD_COLUMNS = [
  "id", "code", "name", "logo_url", "country", "city", "territory_code", "address",
  "property_type", "star_rating", "rooms_total", "rooms_online", "website",
  "booking_engine_url", "lifecycle_status", "online_presence_score", "online_presence_date",
  "support_language", "support_whatsapp", "stack_surveyed_at", "group_id", "group_name",
  "group_type", "legal_entity_id", "legal_name", "ice", "rc_number", "billing_entity_code",
  "sales_owner_name", "csm_owner_name", "stack", "roles_covered", "roles_total", "roles_hws",
  "roles_rival", "next_renewal_date", "next_renewal_in_days", "active_subscriptions",
  "first_activation_date", "gosiyaha_dossiers", "contacts_count", "documents_count",
  "projects", "overdue_renewals", "oldest_overdue_date", "overdue_since_days",
  "created_at", "updated_at",
].join(",");

/* -------------------------------------------------------------------------
   Liste blanche d'ecriture. Toute colonne absente d'ici est refusee par
   l'action serveur, quelle que soit la requete du client.
   ------------------------------------------------------------------------- */

export const EDITABLE_FIELDS = [
  "name", "city", "address", "country", "territory_code", "property_type", "star_rating",
  "rooms_total", "rooms_online", "website", "booking_engine_url", "website_status",
  "support_language", "support_whatsapp", "hr_admin_url", "lead_source",
  "sales_owner", "csm_owner", "group_id", "legal_entity_id", "billing_entity_code",
  "lifecycle_status",
] as const;

export type EditableField = (typeof EDITABLE_FIELDS)[number];

export function isEditableField(value: string): value is EditableField {
  return (EDITABLE_FIELDS as readonly string[]).includes(value);
}

/**
 * Valeurs brutes lues sur la table `property` : v_property_card expose les
 * libelles (sales_owner_name, legal_name...) mais pas tous les identifiants
 * ni website_status / hr_admin_url / lead_source. Une seconde lecture, sur la
 * table cette fois, donne ce qui est reellement modifiable.
 */
export type EditableValues = Record<EditableField, string | number | null>;

export const EDITABLE_COLUMNS = EDITABLE_FIELDS.join(",");

/* -------------------------------------------------------------------------
   Enumerations et validation
   ------------------------------------------------------------------------- */

export const COUNTRIES = ["MA", "TN", "EG", "ES"] as const;

export const LIFECYCLE_VALUES = [
  "prospect", "onboarding", "active", "suspended", "churned", "program_only",
] as const;

export type FieldKind = "text" | "textarea" | "integer" | "url" | "enum" | "reference";

export type FieldSpec = {
  key: EditableField;
  label: string;
  kind: FieldKind;
  block: "identite" | "localisation" | "presence" | "relation";
  /** Replie derriere « Afficher N champs rarement utilises ». */
  rare?: boolean;
  /** Mention affichee sous le champ (« requis pour Go Siyaha »). */
  hint?: string;
  /** Valeurs autorisees pour kind === "enum". */
  values?: readonly string[];
  /** Referentiel a charger pour kind === "reference". */
  reference?: "app_user" | "hotel_group" | "legal_entity" | "billing_entity";
  placeholder?: string;
};

export const FIELD_SPECS: FieldSpec[] = [
  // Identite
  { key: "name", label: "Nom", kind: "text", block: "identite" },
  { key: "property_type", label: "Type", kind: "text", block: "identite", placeholder: "Hôtel, Riad…" },
  { key: "star_rating", label: "Catégorie", kind: "text", block: "identite", placeholder: "4" },
  { key: "rooms_total", label: "Chambres", kind: "integer", block: "identite" },
  { key: "rooms_online", label: "Chambres en ligne", kind: "integer", block: "identite", rare: true },
  { key: "lifecycle_status", label: "Statut", kind: "enum", block: "identite", values: LIFECYCLE_VALUES },

  // Localisation
  { key: "address", label: "Adresse", kind: "textarea", block: "localisation" },
  { key: "city", label: "Ville", kind: "text", block: "localisation" },
  { key: "country", label: "Pays", kind: "enum", block: "localisation", values: COUNTRIES },
  { key: "territory_code", label: "Territoire", kind: "enum", block: "localisation", values: COUNTRIES, rare: true },

  // Presence en ligne
  { key: "website", label: "Site web", kind: "url", block: "presence", placeholder: "https://…" },
  { key: "website_status", label: "État du site", kind: "text", block: "presence" },
  { key: "booking_engine_url", label: "Moteur de réservation", kind: "url", block: "presence" },
  { key: "hr_admin_url", label: "Admin HotelRunner", kind: "url", block: "presence", rare: true },

  // Relation commerciale
  { key: "sales_owner", label: "Commercial", kind: "reference", block: "relation", reference: "app_user" },
  { key: "csm_owner", label: "Client success", kind: "reference", block: "relation", reference: "app_user" },
  { key: "group_id", label: "Groupe", kind: "reference", block: "relation", reference: "hotel_group" },
  {
    key: "legal_entity_id", label: "Société", kind: "reference", block: "relation",
    reference: "legal_entity", hint: "requis pour Go Siyaha",
  },
  { key: "billing_entity_code", label: "Entité de facturation", kind: "reference", block: "relation", reference: "billing_entity", rare: true },
  { key: "lead_source", label: "Origine", kind: "text", block: "relation", rare: true },
  { key: "support_language", label: "Langue du support", kind: "text", block: "relation", rare: true, placeholder: "fr" },
  { key: "support_whatsapp", label: "WhatsApp support", kind: "text", block: "relation", rare: true },
];

export const BLOCKS = [
  { id: "identite", label: "Identité" },
  { id: "localisation", label: "Localisation" },
  { id: "presence", label: "Présence en ligne" },
  { id: "relation", label: "Relation commerciale" },
] as const;

export function fieldSpec(key: EditableField): FieldSpec | undefined {
  return FIELD_SPECS.find((spec) => spec.key === key);
}

/**
 * Normalise et valide une saisie. Retourne la valeur a ecrire, ou un message
 * d'erreur destine a l'utilisateur. La meme fonction sert au client (retour
 * immediat) et au serveur (barriere reelle).
 */
export function normalizeFieldValue(
  key: EditableField,
  raw: string,
): { value: string | number | null } | { error: string } {
  const spec = fieldSpec(key);
  if (!spec) return { error: "Champ non modifiable." };

  const trimmed = raw.trim();
  if (trimmed === "") return { value: null };

  switch (spec.kind) {
    case "integer": {
      if (!/^\d+$/.test(trimmed)) return { error: "Un nombre entier positif est attendu." };
      const parsed = Number(trimmed);
      if (!Number.isSafeInteger(parsed)) return { error: "Nombre hors limites." };
      return { value: parsed };
    }
    case "url": {
      try {
        const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
        if (url.protocol !== "http:" && url.protocol !== "https:") {
          return { error: "L'adresse doit commencer par http ou https." };
        }
        return { value: url.toString() };
      } catch {
        return { error: "Adresse web invalide." };
      }
    }
    case "enum": {
      if (!spec.values?.includes(trimmed)) return { error: "Valeur hors liste." };
      return { value: trimmed };
    }
    case "reference":
      return { value: trimmed };
    default:
      return { value: trimmed };
  }
}

/* -------------------------------------------------------------------------
   Complétude : dix champs, ni plus ni moins (cf. brief).
   ------------------------------------------------------------------------- */

export type CompletenessItem = { label: string; filled: boolean };

export function completeness(
  card: PropertyCard,
  values: EditableValues,
): { items: CompletenessItem[]; filled: number; total: number } {
  const has = (v: unknown) => v !== null && v !== undefined && String(v).trim() !== "";
  const items: CompletenessItem[] = [
    { label: "Nom", filled: has(values.name) },
    { label: "Ville", filled: has(values.city) },
    { label: "Type", filled: has(values.property_type) },
    { label: "Catégorie", filled: has(values.star_rating) },
    { label: "Chambres", filled: has(values.rooms_total) },
    { label: "Adresse", filled: has(values.address) },
    { label: "Site web", filled: has(values.website) },
    { label: "Contact", filled: (card.contacts_count ?? 0) > 0 },
    { label: "Société", filled: has(values.legal_entity_id) },
    { label: "Logo", filled: has(card.logo_url) },
  ];
  return { items, filled: items.filter((i) => i.filled).length, total: items.length };
}
