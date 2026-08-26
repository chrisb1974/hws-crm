import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import type { Database } from "../lib/database.types";
import { useAuth } from "../contexts/AuthContext";

type LifecycleStatus = Database["public"]["Enums"]["lifecycle_status"];
type BillingEntity = Database["public"]["Tables"]["billing_entity"]["Row"];

const LIFECYCLE_OPTIONS: { value: LifecycleStatus; label: string }[] = [
  { value: "prospect", label: "Prospect" },
  { value: "onboarding", label: "Onboarding" },
  { value: "active", label: "Actif" },
  { value: "suspended", label: "Suspendu" },
  { value: "churned", label: "Churné" },
  { value: "program_only", label: "Programme seul" },
];

type FormState = {
  name: string;
  property_type: string;
  star_rating: string;
  country: string;
  city: string;
  address: string;
  latitude: string;
  longitude: string;
  rooms_total: string;
  website: string;
  support_whatsapp: string;
  lifecycle_status: LifecycleStatus;
  billing_entity_code: string;
  description: string;
  facilities: string;
};

const EMPTY: FormState = {
  name: "",
  property_type: "",
  star_rating: "",
  country: "MA",
  city: "",
  address: "",
  latitude: "",
  longitude: "",
  rooms_total: "",
  website: "",
  support_whatsapp: "",
  lifecycle_status: "prospect",
  billing_entity_code: "",
  description: "",
  facilities: "",
};

export function HotelForm() {
  const navigate = useNavigate();
  const { appUser } = useAuth();
  const canWrite = appUser?.role === "admin" || appUser?.role === "sales";

  const [form, setForm] = useState<FormState>(EMPTY);
  const [billingEntities, setBillingEntities] = useState<BillingEntity[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("billing_entity")
      .select("*")
      .order("code")
      .then(({ data }) => setBillingEntities(data ?? []));
  }, []);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canWrite) return;
    setSaving(true);
    setError(null);

    const payload = {
      name: form.name.trim(),
      property_type: form.property_type.trim() || null,
      star_rating: form.star_rating.trim() || null,
      country: form.country.trim() || null,
      city: form.city.trim() || null,
      address: form.address.trim() || null,
      latitude: form.latitude ? Number(form.latitude) : null,
      longitude: form.longitude ? Number(form.longitude) : null,
      rooms_total: form.rooms_total ? Number(form.rooms_total) : null,
      website: form.website.trim() || null,
      support_whatsapp: form.support_whatsapp.trim() || null,
      lifecycle_status: form.lifecycle_status,
      billing_entity_code: form.billing_entity_code || null,
      description: form.description.trim() || null,
      facilities: form.facilities.trim() || null,
    };

    const { data: newCode, error: codeError } = await supabase.rpc(
      "next_property_code",
    );
    if (codeError) {
      setSaving(false);
      return setError(codeError.message);
    }

    const { data: created, error: insertError } = await supabase
      .from("property")
      .insert({ ...payload, code: newCode, custom_fields: {} })
      .select("id")
      .single();

    setSaving(false);
    if (insertError) return setError(insertError.message);
    if (created) navigate(`/hotels/${created.id}`);
  }

  if (!canWrite) {
    return (
      <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-danger">
        Votre rôle ({appUser?.role}) n'a pas les droits d'écriture.
      </p>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link to="/" className="text-sm text-muted hover:underline">
          ← Retour
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-ink">
          Nouvel établissement
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-xl border border-line bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
            Identité
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nom" required className="col-span-2">
              <input
                required
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Type">
              <input
                value={form.property_type}
                onChange={(e) => set("property_type", e.target.value)}
                placeholder="Riad, Hôtel, Maison d'hôte…"
                className={inputClass}
              />
            </Field>
            <Field label="Classement">
              <input
                value={form.star_rating}
                onChange={(e) => set("star_rating", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Statut">
              <select
                value={form.lifecycle_status}
                onChange={(e) =>
                  set("lifecycle_status", e.target.value as LifecycleStatus)
                }
                className={inputClass}
              >
                {LIFECYCLE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Entité de facturation">
              <select
                value={form.billing_entity_code}
                onChange={(e) => set("billing_entity_code", e.target.value)}
                className={inputClass}
              >
                <option value="">—</option>
                {billingEntities.map((b) => (
                  <option key={b.code} value={b.code}>
                    {b.code} — {b.legal_name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </section>

        <section className="rounded-xl border border-line bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
            Localisation
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Pays">
              <input
                value={form.country}
                onChange={(e) => set("country", e.target.value.toUpperCase())}
                maxLength={2}
                placeholder="MA, TN, EG, ES…"
                className={inputClass}
              />
            </Field>
            <Field label="Ville">
              <input
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Adresse" className="col-span-2">
              <input
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Latitude">
              <input
                type="number"
                step="any"
                value={form.latitude}
                onChange={(e) => set("latitude", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Longitude">
              <input
                type="number"
                step="any"
                value={form.longitude}
                onChange={(e) => set("longitude", e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
        </section>

        <section className="rounded-xl border border-line bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
            Contact &amp; stack
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Chambres">
              <input
                type="number"
                min={0}
                value={form.rooms_total}
                onChange={(e) => set("rooms_total", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="WhatsApp support">
              <input
                value={form.support_whatsapp}
                onChange={(e) => set("support_whatsapp", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Site web" className="col-span-2">
              <input
                type="url"
                value={form.website}
                onChange={(e) => set("website", e.target.value)}
                placeholder="https://…"
                className={inputClass}
              />
            </Field>
          </div>
        </section>

        <section className="rounded-xl border border-line bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
            Notes
          </h2>
          <div className="space-y-4">
            <Field label="Description">
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Équipements">
              <textarea
                rows={2}
                value={form.facilities}
                onChange={(e) => set("facilities", e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
        </section>

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-hover disabled:opacity-50"
          >
            {saving ? "Enregistrement…" : "Créer l'établissement"}
          </button>
          <Link
            to="/"
            className="rounded-md border border-line px-4 py-2 text-sm text-muted hover:bg-paper"
          >
            Annuler
          </Link>
        </div>
      </form>
    </div>
  );
}

const inputClass =
  "mt-1 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-brand";

function Field({
  label,
  required,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block text-sm font-medium text-ink ${className ?? ""}`}>
      {label}
      {required && <span className="text-danger"> *</span>}
      {children}
    </label>
  );
}
