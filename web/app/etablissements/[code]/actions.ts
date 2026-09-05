"use server";

import { createClient } from "@/lib/supabase/server";
import {
  isEditableField,
  normalizeFieldValue,
  type EditableField,
} from "@/lib/property-card";

export type SaveResult =
  | { ok: true; value: string | number | null; warning?: string }
  | { ok: false; message: string };

/**
 * Seule voie d'ecriture de la fiche. Elle ecrit sur la table `property`,
 * jamais sur une vue, et n'accepte qu'un champ de la liste blanche.
 *
 * La validation cote client n'est qu'un confort : c'est ici qu'elle fait foi.
 */
export async function updatePropertyField(
  propertyId: string,
  field: string,
  raw: string,
): Promise<SaveResult> {
  if (!isEditableField(field)) {
    return { ok: false, message: "Ce champ n'est pas modifiable." };
  }
  const key: EditableField = field;

  const normalized = normalizeFieldValue(key, raw);
  if ("error" in normalized) return { ok: false, message: normalized.error };
  const value = normalized.value;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Session expirée. Reconnectez-vous." };

  // Etat avant, pour le journal. Sert aussi de controle d'existence.
  const { data: before, error: readError } = await supabase
    .from("property")
    .select(`id,${key}`)
    .eq("id", propertyId)
    .maybeSingle();

  if (readError) return { ok: false, message: readError.message };
  if (!before) return { ok: false, message: "Établissement introuvable." };

  const previous = (before as Record<string, unknown>)[key] ?? null;

  const { error: writeError } = await supabase
    .from("property")
    .update({ [key]: value })
    .eq("id", propertyId);

  if (writeError) {
    // 42501 = insufficient_privilege : la RLS refuse l'ecriture au role support.
    const message =
      writeError.code === "42501"
        ? "Votre compte n'a pas le droit de modifier cette fiche (rôle support)."
        : writeError.message;
    return { ok: false, message };
  }

  const { error: auditError } = await supabase.from("audit_log").insert({
    entity: "property",
    entity_id: propertyId,
    action: "update",
    changed_by: user.id,
    before: { [key]: previous },
    after: { [key]: value },
  });

  return auditError
    ? { ok: true, value, warning: "Modification enregistrée, mais non journalisée." }
    : { ok: true, value };
}

/* -------------------------------------------------------------------------
   Referentiels des listes deroulantes
   ------------------------------------------------------------------------- */

export type Option = { value: string; label: string };

export type References = {
  app_user: Option[];
  hotel_group: Option[];
  legal_entity: Option[];
  billing_entity: Option[];
  /** Vrai quand la RLS masque les autres comptes (role different d'admin). */
  usersRestricted: boolean;
};

export async function loadReferences(): Promise<References> {
  const supabase = await createClient();

  const [users, groups, entities, billing] = await Promise.all([
    supabase.from("app_user").select("id,full_name,email").eq("active", true),
    supabase.from("hotel_group").select("id,name").order("name"),
    supabase.from("legal_entity").select("id,legal_name").order("legal_name"),
    supabase.from("billing_entity").select("code,legal_name").order("code"),
  ]);

  return {
    app_user: (users.data ?? []).map((u) => ({
      value: u.id as string,
      label: (u.full_name as string | null) ?? (u.email as string),
    })),
    hotel_group: (groups.data ?? []).map((g) => ({
      value: g.id as string,
      label: g.name as string,
    })),
    legal_entity: (entities.data ?? []).map((e) => ({
      value: e.id as string,
      label: e.legal_name as string,
    })),
    billing_entity: (billing.data ?? []).map((b) => ({
      value: b.code as string,
      label: `${b.code as string} — ${b.legal_name as string}`,
    })),
    // La policy app_user_select ne laisse voir que sa propre ligne, sauf admin.
    usersRestricted: (users.data ?? []).length <= 1,
  };
}

/* -------------------------------------------------------------------------
   Onglets : charges a l'ouverture, pas avant.
   ------------------------------------------------------------------------- */

export type TabRows = { rows: Record<string, unknown>[]; error: string | null };

async function fetchTab(
  relation: string,
  columns: string,
  filter: { column: string; value: string },
  order?: { column: string; ascending: boolean },
): Promise<TabRows> {
  const supabase = await createClient();
  let query = supabase.from(relation).select(columns).eq(filter.column, filter.value);
  if (order) query = query.order(order.column, { ascending: order.ascending });
  const { data, error } = await query;
  return {
    rows: (data ?? []) as unknown as Record<string, unknown>[],
    error: error?.message ?? null,
  };
}

export async function loadSubscriptions(propertyCode: string) {
  return fetchTab(
    "v_subscription_list",
    "role,status,vendor_code,vendor_name,is_partner,product_name,plan_name,activation_date,renewal_date,onboarding_status,funded_by,billing_frequency",
    { column: "property_code", value: propertyCode },
    { column: "renewal_date", ascending: true },
  );
}

export async function loadGosiyaha(propertyCode: string) {
  return fetchTab(
    "v_gosiyaha_board",
    "code,statut,statut_code,phase,responsable,owner_name,is_terminal,legal_name,updated_at",
    { column: "property_code", value: propertyCode },
    { column: "updated_at", ascending: false },
  );
}

export async function loadContacts(propertyId: string) {
  return fetchTab(
    "contact",
    "id,full_name,email,phone,whatsapp,job_title,language,roles,is_primary,receives_alerts",
    { column: "property_id", value: propertyId },
  );
}

export async function loadProjects(propertyId: string) {
  return fetchTab(
    "v_project_property",
    "project_code,project_name,project_type,membership_status,since",
    { column: "property_id", value: propertyId },
  );
}

export async function loadDocuments(propertyId: string) {
  return fetchTab(
    "document",
    "id,type_code,filename,drive_url,uploaded_at,expires_at",
    { column: "property_id", value: propertyId },
    { column: "uploaded_at", ascending: false },
  );
}

/**
 * audit_log n'est lisible que par un compte admin (policy
 * audit_log_select_admin) : pour les autres roles l'onglet revient vide, ce
 * n'est pas une erreur de chargement.
 */
export async function loadHistory(propertyId: string) {
  return fetchTab(
    "audit_log",
    "id,entity,entity_id,action,changed_by,before,after,at",
    { column: "entity_id", value: propertyId },
    { column: "at", ascending: false },
  );
}
