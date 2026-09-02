import { t } from "@/lib/i18n";
import {
  PropertyRow,
  STACK_ROLES,
  StackRole,
  slots,
} from "@/lib/types";

/* -------------------------------------------------------------------------
   Recherche : repliage accents + casse, en conservant la longueur pour que
   le surlignage retombe sur les bons caracteres de la chaine d'origine.
   ------------------------------------------------------------------------- */

export function fold(value: string): string {
  return Array.from(value)
    .map((char) => (char.normalize("NFD")[0] ?? char).toLowerCase())
    .join("");
}

/** Champs texte parcourus par la recherche, hors fournisseurs du stack. */
function textFields(row: PropertyRow): string[] {
  return [row.name, row.code, row.city, row.group_name].filter(
    (v): v is string => Boolean(v),
  );
}

function vendorFields(row: PropertyRow): string[] {
  return slots(row)
    .filter((s) => s.filled)
    .flatMap((s) => [s.vendor, s.vendor_code, s.product])
    .filter((v): v is string => Boolean(v));
}

export function matchesQuery(row: PropertyRow, foldedQuery: string): boolean {
  if (!foldedQuery) return true;
  return [...textFields(row), ...vendorFields(row)].some((value) =>
    fold(value).includes(foldedQuery),
  );
}

/* -------------------------------------------------------------------------
   Vues enregistrees. Chaque vue est une selection de lignes, jamais un
   recalcul : elle ne lit que des colonnes deja produites par v_property_list.
   ------------------------------------------------------------------------- */

export type SavedViewId =
  | "all"
  | "hotelrunner"
  | "centra"
  | "gosiyaha"
  | "mghNoBeCm"
  | "rival"
  | "renewal60"
  | "overdue"
  | "noStack";

function roleFilled(row: PropertyRow, role: StackRole): boolean {
  return slots(row).some((s) => s.role === role && s.filled);
}

export type SavedView = {
  id: SavedViewId;
  label: string;
  predicate: (row: PropertyRow) => boolean;
};

export const SAVED_VIEWS: SavedView[] = [
  { id: "all", label: t.views.all, predicate: () => true },
  { id: "hotelrunner", label: t.views.hotelrunner, predicate: (r) => r.is_hotelrunner },
  { id: "centra", label: t.views.centra, predicate: (r) => r.is_centra },
  { id: "gosiyaha", label: t.views.gosiyaha, predicate: (r) => r.is_gosiyaha },
  {
    id: "mghNoBeCm",
    label: t.views.mghNoBeCm,
    predicate: (r) => r.is_mgh && !roleFilled(r, "BE") && !roleFilled(r, "CM"),
  },
  { id: "rival", label: t.views.rival, predicate: (r) => r.has_rival_stack },
  {
    id: "renewal60",
    label: t.views.renewal60,
    predicate: (r) =>
      r.next_renewal_in_days !== null &&
      r.next_renewal_in_days >= 0 &&
      r.next_renewal_in_days <= 60,
  },
  {
    // next_renewal_in_days ne descend jamais sous zero (la vue ne garde que les
    // echeances futures) : le retard se lit sur overdue_renewals.
    id: "overdue",
    label: t.views.overdue,
    predicate: (r) => (r.overdue_renewals ?? 0) > 0,
  },
  { id: "noStack", label: t.views.noStack, predicate: (r) => (r.roles_covered ?? 0) === 0 },
];

export function savedView(id: SavedViewId): SavedView {
  return SAVED_VIEWS.find((v) => v.id === id) ?? SAVED_VIEWS[0];
}

/* -------------------------------------------------------------------------
   Filtres
   ------------------------------------------------------------------------- */

export type Filters = {
  country: string;
  city: string;
  propertyType: string;
  status: string;
  vendor: string;
  missingRole: string;
  owner: string;
};

export const EMPTY_FILTERS: Filters = {
  country: "",
  city: "",
  propertyType: "",
  status: "",
  vendor: "",
  missingRole: "",
  owner: "",
};

export function activeFilterCount(filters: Filters): number {
  return Object.values(filters).filter(Boolean).length;
}

export function matchesFilters(row: PropertyRow, filters: Filters): boolean {
  if (filters.country && row.country !== filters.country) return false;
  if (filters.city && row.city !== filters.city) return false;
  if (filters.propertyType && row.property_type !== filters.propertyType) return false;
  if (filters.status && row.lifecycle_status !== filters.status) return false;
  if (filters.owner && (row.sales_owner_name ?? "") !== filters.owner) return false;
  if (filters.vendor && !slots(row).some((s) => s.filled && s.vendor_code === filters.vendor)) {
    return false;
  }
  if (filters.missingRole && roleFilled(row, filters.missingRole as StackRole)) return false;
  return true;
}

/** Listes deroulantes des filtres, construites sur le jeu complet. */
export type FacetOption = { value: string; label: string };

export type Facets = {
  countries: FacetOption[];
  cities: FacetOption[];
  types: FacetOption[];
  statuses: FacetOption[];
  vendors: FacetOption[];
  missingRoles: FacetOption[];
  owners: FacetOption[];
};

const collator = new Intl.Collator("fr", { sensitivity: "base", numeric: true });

function sortedOptions(map: Map<string, string>): FacetOption[] {
  return [...map.entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => collator.compare(a.label, b.label));
}

export function buildFacets(rows: PropertyRow[]): Facets {
  const countries = new Map<string, string>();
  const cities = new Map<string, string>();
  const types = new Map<string, string>();
  const statuses = new Map<string, string>();
  const vendors = new Map<string, string>();
  const owners = new Map<string, string>();

  for (const row of rows) {
    if (row.country) countries.set(row.country, row.country);
    if (row.city) cities.set(row.city, row.city);
    if (row.property_type) types.set(row.property_type, row.property_type);
    if (row.lifecycle_status) {
      statuses.set(
        row.lifecycle_status,
        t.lifecycle[row.lifecycle_status] ?? row.lifecycle_status,
      );
    }
    if (row.sales_owner_name) owners.set(row.sales_owner_name, row.sales_owner_name);
    for (const slot of slots(row)) {
      if (slot.filled && slot.vendor_code) {
        vendors.set(slot.vendor_code, slot.vendor ?? slot.vendor_code);
      }
    }
  }

  return {
    countries: sortedOptions(countries),
    cities: sortedOptions(cities),
    types: sortedOptions(types),
    statuses: sortedOptions(statuses),
    vendors: sortedOptions(vendors),
    owners: sortedOptions(owners),
    missingRoles: STACK_ROLES.map((role) => ({
      value: role,
      label: t.rolesLong[role] ?? role,
    })),
  };
}

/* -------------------------------------------------------------------------
   Tri
   ------------------------------------------------------------------------- */

export type SortKey =
  | "code"
  | "name"
  | "city"
  | "rooms_total"
  | "lifecycle_status"
  | "roles_covered"
  | "next_renewal_in_days"
  | "overdue_since_days";

export type SortDirection = "asc" | "desc";

export type Sort = { key: SortKey; direction: SortDirection };

export const DEFAULT_SORT: Sort = { key: "code", direction: "asc" };

/** Ordre metier des statuts, pour que le tri ne soit pas alphabetique. */
const STATUS_ORDER = [
  "active",
  "onboarding",
  "program_only",
  "prospect",
  "suspended",
  "churned",
];

function comparableText(row: PropertyRow, key: SortKey): string | null {
  switch (key) {
    case "code":
      return row.code;
    case "name":
      return row.name;
    case "city":
      return row.city;
    case "lifecycle_status": {
      const index = STATUS_ORDER.indexOf(row.lifecycle_status);
      return String(index === -1 ? STATUS_ORDER.length : index).padStart(2, "0");
    }
    default:
      return null;
  }
}

function comparableNumber(row: PropertyRow, key: SortKey): number | null {
  switch (key) {
    case "rooms_total":
      return row.rooms_total;
    case "roles_covered":
      return row.roles_covered;
    case "next_renewal_in_days":
      return row.next_renewal_in_days;
    case "overdue_since_days":
      return row.overdue_since_days;
    default:
      return null;
  }
}

export function sortRows(rows: PropertyRow[], sort: Sort): PropertyRow[] {
  const factor = sort.direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const textA = comparableText(a, sort.key);
    if (textA !== null) {
      const textB = comparableText(b, sort.key) ?? "";
      const result = collator.compare(textA, textB);
      if (result !== 0) return result * factor;
    } else {
      const numberA = comparableNumber(a, sort.key);
      const numberB = comparableNumber(b, sort.key);
      // Les valeurs absentes restent en fin de liste dans les deux sens :
      // « a renseigner » n'est pas une echeance lointaine.
      if (numberA === null && numberB !== null) return 1;
      if (numberA !== null && numberB === null) return -1;
      if (numberA !== null && numberB !== null && numberA !== numberB) {
        return (numberA - numberB) * factor;
      }
    }
    return collator.compare(a.code, b.code);
  });
}

/* -------------------------------------------------------------------------
   Pipeline complet
   ------------------------------------------------------------------------- */

export const PAGE_SIZE = 50;

export function selectRows(
  rows: PropertyRow[],
  view: SavedViewId,
  filters: Filters,
  query: string,
  sort: Sort,
): PropertyRow[] {
  const predicate = savedView(view).predicate;
  const foldedQuery = fold(query.trim());
  return sortRows(
    rows.filter(
      (row) =>
        predicate(row) && matchesFilters(row, filters) && matchesQuery(row, foldedQuery),
    ),
    sort,
  );
}
