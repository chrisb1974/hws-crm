import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import type { Database } from "../lib/database.types";
import { useAuth } from "../contexts/AuthContext";

type Property = Database["public"]["Tables"]["property"]["Row"];
type Contact = Database["public"]["Tables"]["contact"]["Row"];
type LifecycleStatus = Database["public"]["Enums"]["lifecycle_status"];
type LegalEntityOption = { id: string; legal_name: string };
type GroupOption = { id: string; name: string };

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  async function loadAll() {
    if (!id) return;
    setLoading(true);
    const [propRes, legalRes, groupRes, contactRes] = await Promise.all([
      supabase.from("property").select("*").eq("id", id).single(),
      supabase
        .from("legal_entity")
        .select("id, legal_name")
        .order("legal_name"),
      supabase.from("hotel_group").select("id, name").order("name"),
      supabase.from("contact").select("*").eq("property_id", id),
    ]);
    if (propRes.error) setError(propRes.error.message);
    else setProperty(propRes.data);
    setLegalEntities(legalRes.data ?? []);
    setGroups(groupRes.data ?? []);
    setContacts(contactRes.data ?? []);
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
        {mode === "edit" ? (
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

      {saveError && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-danger">
          {saveError}
        </p>
      )}

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
