import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import type { Database } from "../lib/database.types";
import { useAuth } from "../contexts/AuthContext";

type Property = Database["public"]["Tables"]["property"]["Row"];
type Contact = Database["public"]["Tables"]["contact"]["Row"];
type Subscription = Database["public"]["Tables"]["subscription"]["Row"];
type Plan = Database["public"]["Tables"]["plan"]["Row"];
type Product = Database["public"]["Tables"]["product"]["Row"];
type Vendor = Database["public"]["Tables"]["vendor"]["Row"];
type StackRow = Database["public"]["Views"]["v_property_stack"]["Row"];
type ContactRole = Database["public"]["Tables"]["contact_role"]["Row"];
type LifecycleStatus = Database["public"]["Enums"]["lifecycle_status"];
type StackRole = Database["public"]["Enums"]["stack_role"];
type LegalEntityOption = { id: string; legal_name: string };
type GroupOption = { id: string; name: string };

type ContactDraft = {
  full_name: string;
  job_title: string;
  email: string;
  phone: string;
  roles: string[];
};

const EMPTY_CONTACT_DRAFT: ContactDraft = {
  full_name: "",
  job_title: "",
  email: "",
  phone: "",
  roles: [],
};

const STATUS_LABEL: Record<string, string> = {
  prospect: "Prospect",
  onboarding: "Onboarding",
  active: "Client actif",
  suspended: "Suspendu",
  churned: "Churné",
  program_only: "Programme seul",
};

const STATUS_COLOR: Record<string, string> = {
  prospect: "border border-brand text-brand",
  onboarding: "bg-sky-600 text-white",
  active: "bg-brand text-white",
  suspended: "bg-orange-500 text-white",
  churned: "bg-neutral-400 text-white",
  program_only: "bg-violet-600 text-white",
};

const LIFECYCLE_OPTIONS: { value: LifecycleStatus; label: string }[] = [
  { value: "prospect", label: "Prospect" },
  { value: "onboarding", label: "Onboarding" },
  { value: "active", label: "Client actif" },
  { value: "suspended", label: "Suspendu" },
  { value: "churned", label: "Churné" },
  { value: "program_only", label: "Programme seul" },
];

const STACK_ROLE_ORDER: StackRole[] = [
  "PMS",
  "CM",
  "BE",
  "SITE",
  "PAYMENT",
  "ADDON",
  "SERVICE",
];

const STACK_ROLE_LABEL: Record<string, string> = {
  PMS: "PMS",
  CM: "CM",
  BE: "BE",
  SITE: "Site",
  PAYMENT: "Paiement",
  ADDON: "Add-on",
  SERVICE: "Service",
};

const SUB_STATUS_LABEL: Record<string, string> = {
  prospect: "Prospect",
  trial: "Essai",
  active: "Actif",
  suspended: "Suspendu",
  terminated: "Terminé",
  migrated: "Migré",
};

const SUB_STATUS_COLOR: Record<string, string> = {
  prospect: "border border-line text-muted",
  trial: "bg-sky-100 text-sky-800",
  active: "bg-emerald-100 text-emerald-800",
  suspended: "bg-orange-100 text-orange-800",
  terminated: "bg-neutral-200 text-neutral-500",
  migrated: "bg-neutral-200 text-neutral-500",
};

type Draft = {
  name: string;
  property_type: string;
  star_rating: string;
  lifecycle_status: LifecycleStatus;
  legal_entity_id: string;
  group_id: string;
  logo_url: string;
  country: string;
  city: string;
  address: string;
  rooms_total: string;
  website: string;
  support_whatsapp: string;
};

function toDraft(p: Property): Draft {
  return {
    name: p.name,
    property_type: p.property_type ?? "",
    star_rating: p.star_rating ?? "",
    lifecycle_status: p.lifecycle_status,
    legal_entity_id: p.legal_entity_id ?? "",
    group_id: p.group_id ?? "",
    logo_url: p.logo_url ?? "",
    country: p.country ?? "",
    city: p.city ?? "",
    address: p.address ?? "",
    rooms_total: p.rooms_total?.toString() ?? "",
    website: p.website ?? "",
    support_whatsapp: p.support_whatsapp ?? "",
  };
}

export function HotelDetail() {
  const { id } = useParams();
  const { appUser } = useAuth();
  const canWrite = appUser?.role === "admin" || appUser?.role === "sales";

  const [property, setProperty] = useState<Property | null>(null);
  const [legalEntities, setLegalEntities] = useState<LegalEntityOption[]>([]);
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [stackRows, setStackRows] = useState<StackRow[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [contactRoles, setContactRoles] = useState<ContactRole[]>([]);

  const [tab, setTab] = useState<"informations" | "abonnements" | "contacts">(
    "informations",
  );

  const [mode, setMode] = useState<"view" | "edit">("view");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [addingContact, setAddingContact] = useState(false);
  const [contactDraft, setContactDraft] = useState({
    full_name: "",
    job_title: "",
    email: "",
    phone: "",
  });
  const [savingContact, setSavingContact] = useState(false);

  // Onglet Contacts : creation et edition en place, jamais de modale.
  const [addingContactInTab, setAddingContactInTab] = useState(false);
  const [newContactDraft, setNewContactDraft] =
    useState<ContactDraft>(EMPTY_CONTACT_DRAFT);
  const [savingNewContact, setSavingNewContact] = useState(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [contactRowDraft, setContactRowDraft] =
    useState<ContactDraft>(EMPTY_CONTACT_DRAFT);
  const [savingContactRow, setSavingContactRow] = useState(false);
  const [contactsError, setContactsError] = useState<string | null>(null);

  async function loadAll() {
    if (!id) return;
    setLoading(true);
    const [
      propRes,
      legalRes,
      groupRes,
      contactRes,
      contactRoleRes,
      stackRes,
      subRes,
      planRes,
      productRes,
      vendorRes,
    ] = await Promise.all([
      supabase.from("property").select("*").eq("id", id).single(),
      supabase
        .from("legal_entity")
        .select("id, legal_name")
        .order("legal_name"),
      supabase.from("hotel_group").select("id, name").order("name"),
      supabase.from("contact").select("*").eq("property_id", id),
      supabase.from("contact_role").select("*").order("code"),
      supabase.from("v_property_stack").select("*").eq("property_id", id),
      supabase.from("subscription").select("*").eq("property_id", id),
      supabase.from("plan").select("*"),
      supabase.from("product").select("*"),
      supabase.from("vendor").select("*"),
    ]);
    if (propRes.error) setError(propRes.error.message);
    else setProperty(propRes.data);
    setLegalEntities(legalRes.data ?? []);
    setGroups(groupRes.data ?? []);
    setContacts(contactRes.data ?? []);
    setContactRoles(contactRoleRes.data ?? []);
    setStackRows(stackRes.data ?? []);
    setSubscriptions(subRes.data ?? []);
    setPlans(planRes.data ?? []);
    setProducts(productRes.data ?? []);
    setVendors(vendorRes.data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function startEdit() {
    if (!property) return;
    setDraft(toDraft(property));
    setSaveError(null);
    setMode("edit");
  }

  function cancelEdit() {
    setDraft(null);
    setSaveError(null);
    setMode("view");
  }

  function setField<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!draft || !property) return;
    setSaving(true);
    setSaveError(null);

    const payload = {
      name: draft.name.trim(),
      property_type: draft.property_type.trim() || null,
      star_rating: draft.star_rating.trim() || null,
      lifecycle_status: draft.lifecycle_status,
      legal_entity_id: draft.legal_entity_id || null,
      group_id: draft.group_id || null,
      logo_url: draft.logo_url.trim() || null,
      country: draft.country.trim() || null,
      city: draft.city.trim() || null,
      address: draft.address.trim() || null,
      rooms_total: draft.rooms_total ? Number(draft.rooms_total) : null,
      website: draft.website.trim() || null,
      support_whatsapp: draft.support_whatsapp.trim() || null,
    };

    const { data, error } = await supabase
      .from("property")
      .update(payload)
      .eq("id", property.id)
      .select("*")
      .single();

    setSaving(false);
    if (error) return setSaveError(error.message);
    setProperty(data);
    setMode("view");
  }

  async function handleAddSignatory(e: FormEvent) {
    e.preventDefault();
    if (!property) return;
    setSavingContact(true);
    const { data, error } = await supabase
      .from("contact")
      .insert({
        property_id: property.id,
        full_name: contactDraft.full_name.trim() || null,
        job_title: contactDraft.job_title.trim() || null,
        email: contactDraft.email.trim() || null,
        phone: contactDraft.phone.trim() || null,
        roles: ["signatory"],
      })
      .select("*")
      .single();
    setSavingContact(false);
    if (error) return setSaveError(error.message);
    if (data) setContacts((c) => [...c, data]);
    setAddingContact(false);
    setContactDraft({ full_name: "", job_title: "", email: "", phone: "" });
  }

  function toggleDraftRole(
    draft: ContactDraft,
    setter: (d: ContactDraft) => void,
    code: string,
  ) {
    const has = draft.roles.includes(code);
    setter({
      ...draft,
      roles: has ? draft.roles.filter((r) => r !== code) : [...draft.roles, code],
    });
  }

  async function handleAddContactInTab(e: FormEvent) {
    e.preventDefault();
    if (!property) return;
    setSavingNewContact(true);
    setContactsError(null);
    const { data, error } = await supabase
      .from("contact")
      .insert({
        property_id: property.id,
        full_name: newContactDraft.full_name.trim() || null,
        job_title: newContactDraft.job_title.trim() || null,
        email: newContactDraft.email.trim() || null,
        phone: newContactDraft.phone.trim() || null,
        roles: newContactDraft.roles,
      })
      .select("*")
      .single();
    setSavingNewContact(false);
    if (error) return setContactsError(error.message);
    if (data) setContacts((c) => [...c, data]);
    setAddingContactInTab(false);
    setNewContactDraft(EMPTY_CONTACT_DRAFT);
  }

  function startEditContactRow(c: Contact) {
    setEditingContactId(c.id);
    setContactRowDraft({
      full_name: c.full_name ?? "",
      job_title: c.job_title ?? "",
      email: c.email ?? "",
      phone: c.phone ?? "",
      roles: c.roles ?? [],
    });
    setContactsError(null);
  }

  async function handleSaveContactRow(e: FormEvent) {
    e.preventDefault();
    if (!editingContactId) return;
    setSavingContactRow(true);
    setContactsError(null);
    const { data, error } = await supabase
      .from("contact")
      .update({
        full_name: contactRowDraft.full_name.trim() || null,
        job_title: contactRowDraft.job_title.trim() || null,
        email: contactRowDraft.email.trim() || null,
        phone: contactRowDraft.phone.trim() || null,
        roles: contactRowDraft.roles,
      })
      .eq("id", editingContactId)
      .select("*")
      .single();
    setSavingContactRow(false);
    if (error) return setContactsError(error.message);
    if (data) setContacts((cs) => cs.map((c) => (c.id === data.id ? data : c)));
    setEditingContactId(null);
  }

  async function handleDeleteContact(contactId: string) {
    if (!window.confirm("Supprimer ce contact ?")) return;
    setContactsError(null);
    const { error } = await supabase.from("contact").delete().eq("id", contactId);
    if (error) return setContactsError(error.message);
    setContacts((cs) => cs.filter((c) => c.id !== contactId));
  }

  if (loading) return <p className="text-muted">Chargement…</p>;

  if (error || !property) {
    return (
      <div>
        <Link to="/" className="text-sm text-muted hover:underline">
          ← Retour
        </Link>
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-danger">
          {error ?? "Établissement introuvable."}
        </p>
      </div>
    );
  }

  const group = groups.find((g) => g.id === property.group_id) ?? null;
  const legalEntity =
    legalEntities.find((l) => l.id === property.legal_entity_id) ?? null;
  const signatory = contacts.find((c) => c.roles?.includes("signatory"));

  const missing: { label: string; detail: string; action?: "contact" }[] = [];
  if (!property.legal_entity_id) {
    missing.push({
      label: "Entité juridique",
      detail: "RC / ICE requis pour tout devis et tout dossier Go Siyaha",
    });
  }
  if (!signatory) {
    missing.push({
      label: "Contact signataire",
      detail: "Aucun contact enregistré",
      action: "contact",
    });
  }
  if (!property.logo_url) {
    missing.push({
      label: "Logo",
      detail: "Bloque la génération des livrables Go Siyaha",
    });
  }

  function describeSubscription(s: Subscription) {
    const plan = s.plan_id ? plans.find((p) => p.id === s.plan_id) : null;
    const product = plan ? products.find((p) => p.id === plan.product_id) : null;
    const vendorCode = product?.vendor_code ?? s.vendor_code;
    const vendor = vendorCode ? vendors.find((v) => v.code === vendorCode) : null;
    return {
      vendorName: vendor?.name ?? vendorCode ?? "—",
      productName: product?.name ?? plan?.name ?? null,
    };
  }

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between text-sm text-muted">
        <div>
          <Link to="/" className="hover:underline">
            Établissements
          </Link>
          {group && (
            <>
              {" / "}
              <span>{group.name}</span>
            </>
          )}
          {" / "}
          <span className="text-ink">{property.name}</span>
        </div>
      </div>

      <div className="mt-3 flex items-start justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-line bg-white text-xs text-muted">
            {property.logo_url ? (
              <img
                src={property.logo_url}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              "LOGO ABSENT"
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-ink">
                {property.name}
              </h1>
              <span className="rounded-full border border-line px-2 py-0.5 font-mono text-xs text-muted">
                {property.code}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted">
              {[
                [property.city, property.country].filter(Boolean).join(", "),
                property.property_type,
                property.rooms_total ? `${property.rooms_total} chambres` : null,
                legalEntity ? legalEntity.legal_name : "Entité juridique non renseignée",
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-start gap-6">
          <div className="text-right text-xs text-muted">
            <div>
              <span className="uppercase tracking-wide">Commercial</span>
              <p className="text-sm font-medium text-ink">Non assigné</p>
            </div>
            <div className="mt-2">
              <span className="uppercase tracking-wide">Client success</span>
              <p className="text-sm font-medium text-ink">Non assigné</p>
            </div>
          </div>
          {canWrite &&
            tab === "informations" &&
            (mode === "view" ? (
              <button
                onClick={startEdit}
                className="shrink-0 rounded-md border border-line bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-paper"
              >
                Modifier
              </button>
            ) : (
              <div className="flex shrink-0 gap-2">
                <button
                  form="hotel-edit-form"
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
                >
                  {saving ? "Enregistrement…" : "Enregistrer"}
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="rounded-md border border-line px-4 py-2 text-sm text-muted hover:bg-paper"
                >
                  Annuler
                </button>
              </div>
            ))}
        </div>
      </div>

      <div className="mt-3">
        {mode === "edit" && tab === "informations" ? (
          <select
            value={draft?.lifecycle_status}
            onChange={(e) =>
              setField("lifecycle_status", e.target.value as LifecycleStatus)
            }
            className="rounded-full border border-line px-3 py-1 text-xs font-medium uppercase tracking-wide"
          >
            {LIFECYCLE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ) : (
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wide ${
              STATUS_COLOR[property.lifecycle_status] ?? "bg-neutral-100 text-neutral-700"
            }`}
          >
            {STATUS_LABEL[property.lifecycle_status] ?? property.lifecycle_status}
          </span>
        )}
      </div>

      {/* Croquis du stack — lecture seule, genere depuis v_property_stack */}
      <div className="mt-6 rounded-xl border border-line bg-white p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Croquis du stack
          </h2>
          <span className="text-xs text-muted">
            {subscriptions.length} ligne{subscriptions.length !== 1 ? "s" : ""}{" "}
            d'abonnement · lecture seule
          </span>
        </div>
        {property.stack_surveyed_at ? (
          <p className="mt-1 text-xs text-muted">
            Relevé du {new Date(property.stack_surveyed_at).toLocaleDateString("fr-FR")}
          </p>
        ) : (
          <p className="mt-1 text-xs text-muted">
            Stack jamais relevé — un rôle « aucun » ici signifie inconnu, pas confirmé vide.
          </p>
        )}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {STACK_ROLE_ORDER.map((role) => {
            // Un role peut porter plusieurs lignes actives en meme temps
            // (ex : 3 add-ons HotelRunner simultanes) — v_property_stack
            // renvoie une ligne par abonnement, pas une par role.
            const rows = stackRows.filter((r) => r.role === role);
            const filledRows = rows.filter((r) => r.role_state === "filled");
            const roleState = rows[0]?.role_state;
            return (
              <div
                key={role}
                className={`rounded-lg border p-3 text-xs ${
                  filledRows.length > 0
                    ? "border-brand/40 bg-brand/5"
                    : "border-dashed border-line"
                }`}
              >
                <p className="font-semibold uppercase tracking-wide text-muted">
                  {STACK_ROLE_LABEL[role]}
                </p>
                {filledRows.length > 0 ? (
                  <div className="mt-1 space-y-1.5">
                    {filledRows.map((row) => (
                      <div key={row.subscription_id}>
                        <p className="font-medium text-ink">{row.vendor}</p>
                        <p
                          className={`mt-0.5 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-medium uppercase ${
                            SUB_STATUS_COLOR[row.status ?? ""] ?? "bg-neutral-100 text-neutral-700"
                          }`}
                        >
                          {SUB_STATUS_LABEL[row.status ?? ""] ?? row.status}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-muted">
                    {roleState === "none" ? "Aucun (confirmé)" : "Aucun"}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex gap-6 border-b border-line text-sm">
        <button
          onClick={() => setTab("informations")}
          className={`-mb-px border-b-2 px-1 py-2 font-medium ${
            tab === "informations"
              ? "border-brand text-brand"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          Informations
        </button>
        <button
          onClick={() => setTab("abonnements")}
          className={`-mb-px border-b-2 px-1 py-2 font-medium ${
            tab === "abonnements"
              ? "border-brand text-brand"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          Abonnements {subscriptions.length}
        </button>
        <button
          onClick={() => setTab("contacts")}
          className={`-mb-px border-b-2 px-1 py-2 font-medium ${
            tab === "contacts"
              ? "border-brand text-brand"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          Contacts {contacts.length}
        </button>
      </div>

      {saveError && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-danger">
          {saveError}
        </p>
      )}

      {tab === "informations" && (
        <form
          id="hotel-edit-form"
          onSubmit={handleSave}
          className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3"
        >
          <Panel title="Identité">
            <InfoField label="Code HWS" hint="Σ attribué" value={property.code} />
            <InfoField
              label="Nom"
              value={property.name}
              editing={mode === "edit"}
              input={
                <input
                  required
                  value={draft?.name}
                  onChange={(e) => setField("name", e.target.value)}
                  className={inlineInputClass}
                />
              }
            />
            <InfoField
              label="Entité juridique"
              value={legalEntity?.legal_name ?? null}
              missingText="Non renseignée"
              editing={mode === "edit"}
              input={
                <select
                  value={draft?.legal_entity_id}
                  onChange={(e) => setField("legal_entity_id", e.target.value)}
                  className={inlineInputClass}
                >
                  <option value="">—</option>
                  {legalEntities.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.legal_name}
                    </option>
                  ))}
                </select>
              }
            />
            <InfoField
              label="Groupe"
              value={group?.name ?? null}
              missingText="Aucun"
              editing={mode === "edit"}
              input={
                <select
                  value={draft?.group_id}
                  onChange={(e) => setField("group_id", e.target.value)}
                  className={inlineInputClass}
                >
                  <option value="">—</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              }
            />
            <InfoField
              label="Logo"
              value={property.logo_url ? "Renseigné" : null}
              missingText="Absent"
              editing={mode === "edit"}
              input={
                <input
                  type="url"
                  placeholder="URL du logo"
                  value={draft?.logo_url}
                  onChange={(e) => setField("logo_url", e.target.value)}
                  className={inlineInputClass}
                />
              }
            />
          </Panel>

          <Panel title="Localisation & caractéristiques">
            <InfoField
              label="Ville, pays"
              value={[property.city, property.country].filter(Boolean).join(", ") || null}
              editing={mode === "edit"}
              input={
                <div className="mt-1 flex gap-2">
                  <input
                    value={draft?.city}
                    onChange={(e) => setField("city", e.target.value)}
                    placeholder="Ville"
                    className={inlineInputClass}
                  />
                  <input
                    value={draft?.country}
                    onChange={(e) => setField("country", e.target.value.toUpperCase())}
                    placeholder="Pays"
                    maxLength={2}
                    className={`${inlineInputClass} w-20`}
                  />
                </div>
              }
            />
            <InfoField
              label="Adresse"
              value={property.address}
              missingText="Non renseignée"
              editing={mode === "edit"}
              input={
                <input
                  value={draft?.address}
                  onChange={(e) => setField("address", e.target.value)}
                  className={inlineInputClass}
                />
              }
            />
            <InfoField
              label="Type"
              value={property.property_type}
              editing={mode === "edit"}
              input={
                <input
                  value={draft?.property_type}
                  onChange={(e) => setField("property_type", e.target.value)}
                  placeholder="Riad, Hôtel…"
                  className={inlineInputClass}
                />
              }
            />
            <InfoField
              label="Classement"
              value={property.star_rating}
              editing={mode === "edit"}
              input={
                <input
                  value={draft?.star_rating}
                  onChange={(e) => setField("star_rating", e.target.value)}
                  className={inlineInputClass}
                />
              }
            />
            <InfoField
              label="Chambres"
              value={property.rooms_total?.toString() ?? null}
              editing={mode === "edit"}
              input={
                <input
                  type="number"
                  min={0}
                  value={draft?.rooms_total}
                  onChange={(e) => setField("rooms_total", e.target.value)}
                  className={inlineInputClass}
                />
              }
            />
            <InfoField
              label="Site web"
              value={property.website}
              missingText="Aucun site constaté"
              link={property.website ?? undefined}
              editing={mode === "edit"}
              input={
                <input
                  type="url"
                  value={draft?.website}
                  onChange={(e) => setField("website", e.target.value)}
                  placeholder="https://…"
                  className={inlineInputClass}
                />
              }
            />
            <InfoField
              label="WhatsApp support"
              value={property.support_whatsapp}
              editing={mode === "edit"}
              input={
                <input
                  value={draft?.support_whatsapp}
                  onChange={(e) => setField("support_whatsapp", e.target.value)}
                  className={inlineInputClass}
                />
              }
            />
          </Panel>

          <div className="rounded-xl border-2 border-brand/30 bg-white p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-brand">
              Ce qui manque pour vendre
            </h2>
            {missing.length === 0 ? (
              <p className="mt-3 text-sm text-muted">Rien à signaler.</p>
            ) : (
              <ol className="mt-3 space-y-3">
                {missing.map((m, i) => (
                  <li key={m.label} className="text-sm">
                    <span className="font-semibold text-ink">
                      {i + 1}. {m.label}
                    </span>
                    <p className="text-muted">{m.detail}</p>
                  </li>
                ))}
              </ol>
            )}

            {canWrite && !signatory && (
              <div className="mt-4 border-t border-line pt-4">
                {addingContact ? (
                  <form onSubmit={handleAddSignatory} className="space-y-2">
                    <input
                      required
                      placeholder="Nom complet"
                      value={contactDraft.full_name}
                      onChange={(e) =>
                        setContactDraft((c) => ({ ...c, full_name: e.target.value }))
                      }
                      className={inlineInputClass}
                    />
                    <input
                      placeholder="Fonction"
                      value={contactDraft.job_title}
                      onChange={(e) =>
                        setContactDraft((c) => ({ ...c, job_title: e.target.value }))
                      }
                      className={inlineInputClass}
                    />
                    <input
                      type="email"
                      placeholder="Email"
                      value={contactDraft.email}
                      onChange={(e) =>
                        setContactDraft((c) => ({ ...c, email: e.target.value }))
                      }
                      className={inlineInputClass}
                    />
                    <input
                      placeholder="Téléphone"
                      value={contactDraft.phone}
                      onChange={(e) =>
                        setContactDraft((c) => ({ ...c, phone: e.target.value }))
                      }
                      className={inlineInputClass}
                    />
                    <div className="flex gap-2 pt-1">
                      <button
                        type="submit"
                        disabled={savingContact}
                        className="rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-hover disabled:opacity-50"
                      >
                        {savingContact ? "…" : "Enregistrer"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setAddingContact(false)}
                        className="rounded-md border border-line px-3 py-1.5 text-xs text-muted hover:bg-paper"
                      >
                        Annuler
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAddingContact(true)}
                    className="w-full rounded-md border border-line px-3 py-2 text-sm text-ink hover:bg-paper"
                  >
                    Ajouter un contact
                  </button>
                )}
              </div>
            )}
          </div>
        </form>
      )}

      {tab === "abonnements" && (
        <div className="mt-6 overflow-x-auto rounded-xl border border-line bg-white">
          {subscriptions.length === 0 ? (
            <p className="p-6 text-sm text-muted">Aucun abonnement enregistré.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-line bg-paper text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Rôle</th>
                  <th className="px-4 py-3 font-medium">Fournisseur · produit</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 font-medium">Activation</th>
                  <th className="px-4 py-3 font-medium">Renouvellement</th>
                  <th className="px-4 py-3 font-medium">Prix de vente</th>
                  <th className="px-4 py-3 font-medium">Cohorte</th>
                  <th className="px-4 py-3 font-medium">Financement</th>
                  <th className="px-4 py-3 font-medium">Marge</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((s) => {
                  const { vendorName, productName } = describeSubscription(s);
                  const margin =
                    s.sale_price != null && s.vendor_cost != null
                      ? s.sale_price - s.vendor_cost
                      : null;
                  return (
                    <tr
                      key={s.id}
                      className="border-b border-line last:border-0 hover:bg-paper"
                    >
                      <td className="px-4 py-3">
                        <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs font-medium uppercase text-neutral-700">
                          {STACK_ROLE_LABEL[s.role] ?? s.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-ink">
                        {vendorName}
                        {productName && (
                          <span className="text-muted"> · {productName}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            SUB_STATUS_COLOR[s.status] ?? "bg-neutral-100 text-neutral-700"
                          }`}
                        >
                          {SUB_STATUS_LABEL[s.status] ?? s.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {s.activation_date
                          ? new Date(s.activation_date).toLocaleDateString("fr-FR")
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {s.renewal_date
                          ? new Date(s.renewal_date).toLocaleDateString("fr-FR")
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {s.sale_price != null
                          ? `${s.sale_price} ${s.sale_currency ?? ""}`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-muted">{s.pricing_cohort ?? "—"}</td>
                      <td className="px-4 py-3 text-muted">{s.funded_by ?? "—"}</td>
                      <td className="px-4 py-3 text-muted">
                        {margin != null ? `${margin} ${s.sale_currency ?? ""}` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "contacts" && (
        <div className="mt-6 space-y-4">
          {contactsError && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-danger">
              {contactsError}
            </p>
          )}

          <div className="overflow-x-auto rounded-xl border border-line bg-white">
            {contacts.length === 0 ? (
              <p className="p-6 text-sm text-muted">Aucun contact enregistré.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b border-line bg-paper text-left text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">Nom</th>
                    <th className="px-4 py-3 font-medium">Fonction</th>
                    <th className="px-4 py-3 font-medium">Rôles</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Téléphone</th>
                    {canWrite && <th className="px-4 py-3 font-medium" />}
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((c) =>
                    editingContactId === c.id ? (
                      <tr key={c.id} className="border-b border-line last:border-0 bg-paper">
                        <td colSpan={canWrite ? 6 : 5} className="px-4 py-3">
                          <form
                            onSubmit={handleSaveContactRow}
                            className="grid grid-cols-2 gap-3 lg:grid-cols-4"
                          >
                            <input
                              required
                              placeholder="Nom complet"
                              value={contactRowDraft.full_name}
                              onChange={(e) =>
                                setContactRowDraft((d) => ({ ...d, full_name: e.target.value }))
                              }
                              className={inlineInputClass}
                            />
                            <input
                              placeholder="Fonction"
                              value={contactRowDraft.job_title}
                              onChange={(e) =>
                                setContactRowDraft((d) => ({ ...d, job_title: e.target.value }))
                              }
                              className={inlineInputClass}
                            />
                            <input
                              type="email"
                              placeholder="Email"
                              value={contactRowDraft.email}
                              onChange={(e) =>
                                setContactRowDraft((d) => ({ ...d, email: e.target.value }))
                              }
                              className={inlineInputClass}
                            />
                            <input
                              placeholder="Téléphone"
                              value={contactRowDraft.phone}
                              onChange={(e) =>
                                setContactRowDraft((d) => ({ ...d, phone: e.target.value }))
                              }
                              className={inlineInputClass}
                            />
                            <div className="col-span-2 flex flex-wrap gap-3 text-xs text-ink lg:col-span-4">
                              {contactRoles.map((r) => (
                                <label key={r.code} className="flex items-center gap-1.5">
                                  <input
                                    type="checkbox"
                                    checked={contactRowDraft.roles.includes(r.code)}
                                    onChange={() =>
                                      toggleDraftRole(contactRowDraft, setContactRowDraft, r.code)
                                    }
                                  />
                                  {r.label_fr ?? r.code}
                                </label>
                              ))}
                            </div>
                            <div className="col-span-2 flex gap-2 lg:col-span-4">
                              <button
                                type="submit"
                                disabled={savingContactRow}
                                className="rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-hover disabled:opacity-50"
                              >
                                {savingContactRow ? "…" : "Enregistrer"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingContactId(null)}
                                className="rounded-md border border-line px-3 py-1.5 text-xs text-muted hover:bg-paper"
                              >
                                Annuler
                              </button>
                            </div>
                          </form>
                        </td>
                      </tr>
                    ) : (
                      <tr key={c.id} className="border-b border-line last:border-0 hover:bg-paper">
                        <td className="px-4 py-3 text-ink">{c.full_name ?? "—"}</td>
                        <td className="px-4 py-3 text-muted">{c.job_title ?? "—"}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {(c.roles ?? []).length === 0 ? (
                              <span className="text-muted">—</span>
                            ) : (
                              c.roles!.map((code) => (
                                <span
                                  key={code}
                                  className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs font-medium text-neutral-700"
                                >
                                  {contactRoles.find((r) => r.code === code)?.label_fr ?? code}
                                </span>
                              ))
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted">{c.email ?? "—"}</td>
                        <td className="px-4 py-3 text-muted">{c.phone ?? "—"}</td>
                        {canWrite && (
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => startEditContactRow(c)}
                              className="mr-3 text-xs text-brand hover:underline"
                            >
                              Modifier
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteContact(c.id)}
                              className="text-xs text-danger hover:underline"
                            >
                              Supprimer
                            </button>
                          </td>
                        )}
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            )}
          </div>

          {canWrite &&
            (addingContactInTab ? (
              <form
                onSubmit={handleAddContactInTab}
                className="rounded-xl border border-line bg-white p-5"
              >
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
                  Nouveau contact
                </h2>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <input
                    required
                    placeholder="Nom complet"
                    value={newContactDraft.full_name}
                    onChange={(e) =>
                      setNewContactDraft((d) => ({ ...d, full_name: e.target.value }))
                    }
                    className={inlineInputClass}
                  />
                  <input
                    placeholder="Fonction"
                    value={newContactDraft.job_title}
                    onChange={(e) =>
                      setNewContactDraft((d) => ({ ...d, job_title: e.target.value }))
                    }
                    className={inlineInputClass}
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={newContactDraft.email}
                    onChange={(e) =>
                      setNewContactDraft((d) => ({ ...d, email: e.target.value }))
                    }
                    className={inlineInputClass}
                  />
                  <input
                    placeholder="Téléphone"
                    value={newContactDraft.phone}
                    onChange={(e) =>
                      setNewContactDraft((d) => ({ ...d, phone: e.target.value }))
                    }
                    className={inlineInputClass}
                  />
                </div>
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-ink">
                  {contactRoles.map((r) => (
                    <label key={r.code} className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={newContactDraft.roles.includes(r.code)}
                        onChange={() =>
                          toggleDraftRole(newContactDraft, setNewContactDraft, r.code)
                        }
                      />
                      {r.label_fr ?? r.code}
                    </label>
                  ))}
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    type="submit"
                    disabled={savingNewContact}
                    className="rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-hover disabled:opacity-50"
                  >
                    {savingNewContact ? "…" : "Enregistrer"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAddingContactInTab(false);
                      setNewContactDraft(EMPTY_CONTACT_DRAFT);
                    }}
                    className="rounded-md border border-line px-3 py-1.5 text-xs text-muted hover:bg-paper"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setAddingContactInTab(true)}
                className="w-full rounded-md border border-dashed border-line px-3 py-3 text-sm text-muted hover:bg-paper"
              >
                + Ajouter un contact
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

const inlineInputClass =
  "mt-1 w-full rounded-md border border-line bg-white px-2 py-1 text-sm outline-none focus:border-brand";

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-white p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
        {title}
      </h2>
      <dl className="mt-3 space-y-3">{children}</dl>
    </div>
  );
}

function InfoField({
  label,
  value,
  hint,
  missingText = "—",
  link,
  editing,
  input,
}: {
  label: string;
  value: string | null | undefined;
  hint?: string;
  missingText?: string;
  link?: string;
  editing?: boolean;
  input?: React.ReactNode;
}) {
  const missing = !value;
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      {editing && input ? (
        <dd>{input}</dd>
      ) : (
        <dd
          className={`border-b border-dashed pb-0.5 text-sm ${
            missing
              ? "border-danger/50 text-danger"
              : "border-line text-ink"
          }`}
        >
          {hint && <span className="mr-1 text-muted">Σ</span>}
          {link && value ? (
            <a
              href={link}
              target="_blank"
              rel="noreferrer"
              className="text-brand hover:underline"
            >
              {value}
            </a>
          ) : (
            value ?? missingText
          )}
          {hint && <span className="ml-1 text-xs text-muted">({hint})</span>}
        </dd>
      )}
    </div>
  );
}
