/**
 * Reflet exact des colonnes de `public.v_property_list`. Rien n'est calcule
 * ici : tout ce que l'ecran affiche vient de la vue (regle de fond n°3).
 */

export const STACK_ROLES = [
  "CRS",
  "PMS",
  "CM",
  "BE",
  "SITE",
  "PAYMENT",
  "ADDON",
  "SERVICE",
] as const;

export type StackRole = (typeof STACK_ROLES)[number];

export type StackSlot = {
  role: StackRole;
  filled: boolean;
  vendor_code: string | null;
  vendor: string | null;
  product: string | null;
  is_hws: boolean;
  status: string | null;
  renewal_date: string | null;
};

export type LifecycleStatus =
  | "prospect"
  | "onboarding"
  | "active"
  | "suspended"
  | "churned"
  | "program_only";

export type PropertyRow = {
  id: string;
  code: string;
  name: string;
  city: string | null;
  country: string | null;
  territory_code: string | null;
  property_type: string | null;
  star_rating: string | null;
  rooms_total: number | null;
  lifecycle_status: LifecycleStatus | string;
  group_name: string | null;
  sales_owner_name: string | null;
  roles_covered: number | null;
  roles_total: number | null;
  roles_hws: number | null;
  roles_rival: number | null;
  stack: StackSlot[] | null;
  next_renewal_date: string | null;
  // Toujours >= 0 : la vue ne retient que les echeances a venir
  // (min(renewal_date) WHERE renewal_date >= CURRENT_DATE). Les retards se
  // lisent sur overdue_renewals / overdue_since_days, jamais ici.
  next_renewal_in_days: number | null;
  overdue_renewals: number | null;
  overdue_since_days: number | null;
  active_subscriptions: number | null;
  gosiyaha_dossiers: number | null;
  is_hotelrunner: boolean;
  is_centra: boolean;
  is_simple_booking: boolean;
  is_siteminder: boolean;
  is_mgh: boolean;
  is_gosiyaha: boolean;
  has_rival_stack: boolean;
  updated_at: string | null;
};

/** La vue renvoie toujours les huit roles ; on se protege quand meme d'un null. */
export function slots(row: PropertyRow): StackSlot[] {
  if (!row.stack || row.stack.length === 0) {
    return STACK_ROLES.map((role) => ({
      role,
      filled: false,
      vendor_code: null,
      vendor: null,
      product: null,
      is_hws: false,
      status: null,
      renewal_date: null,
    }));
  }
  return row.stack;
}

export function slotFor(row: PropertyRow, role: StackRole): StackSlot | undefined {
  return slots(row).find((s) => s.role === role);
}
