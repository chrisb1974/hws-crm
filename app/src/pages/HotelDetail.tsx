import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import type { Database } from "../lib/database.types";
import { useAuth } from "../contexts/AuthContext";

type Property = Database["public"]["Tables"]["property"]["Row"];

const STATUS_LABEL: Record<string, string> = {
  prospect: "Prospect",
  onboarding: "Onboarding",
  active: "Actif",
  suspended: "Suspendu",
  churned: "Churné",
  program_only: "Programme seul",
};

export function HotelDetail() {
  const { id } = useParams();
  const { appUser } = useAuth();
  const canWrite = appUser?.role === "admin" || appUser?.role === "sales";

  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    supabase
      .from("property")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) setError(error.message);
        else setProperty(data);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

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

  return (
    <div className="max-w-3xl">
      <Link to="/" className="text-sm text-muted hover:underline">
        ← Retour
      </Link>

      <div className="mt-2 flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs text-muted">{property.code}</p>
          <h1 className="text-2xl font-semibold text-ink">{property.name}</h1>
          <p className="mt-1 text-sm text-muted">
            {[property.property_type, property.city, property.country]
              .filter(Boolean)
              .join(" · ") || "—"}
          </p>
        </div>
        {canWrite && (
          <Link
            to={`/hotels/${property.id}/edit`}
            className="shrink-0 rounded-md border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-paper"
          >
            Modifier
          </Link>
        )}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <InfoCard title="Statut">
          <p className="text-sm text-ink">
            {STATUS_LABEL[property.lifecycle_status] ?? property.lifecycle_status}
          </p>
        </InfoCard>
        <InfoCard title="Entité de facturation">
          <p className="text-sm text-ink">{property.billing_entity_code ?? "—"}</p>
        </InfoCard>
        <InfoCard title="Chambres">
          <p className="text-sm text-ink">{property.rooms_total ?? "—"}</p>
        </InfoCard>
        <InfoCard title="Classement">
          <p className="text-sm text-ink">{property.star_rating ?? "—"}</p>
        </InfoCard>
        <InfoCard title="Adresse" className="col-span-2">
          <p className="text-sm text-ink">{property.address ?? "—"}</p>
          {property.latitude && property.longitude && (
            <p className="mt-1 text-xs text-muted">
              {property.latitude}, {property.longitude}
            </p>
          )}
        </InfoCard>
        <InfoCard title="Site web">
          {property.website ? (
            <a
              href={property.website}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-brand hover:underline"
            >
              {property.website}
            </a>
          ) : (
            <p className="text-sm text-ink">—</p>
          )}
        </InfoCard>
        <InfoCard title="WhatsApp support">
          <p className="text-sm text-ink">{property.support_whatsapp ?? "—"}</p>
        </InfoCard>
        {property.description && (
          <InfoCard title="Description" className="col-span-2">
            <p className="whitespace-pre-wrap text-sm text-ink">
              {property.description}
            </p>
          </InfoCard>
        )}
        {property.facilities && (
          <InfoCard title="Équipements" className="col-span-2">
            <p className="whitespace-pre-wrap text-sm text-ink">
              {property.facilities}
            </p>
          </InfoCard>
        )}
      </div>
    </div>
  );
}

function InfoCard({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-xl border border-line bg-white p-4 ${className ?? ""}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
        {title}
      </p>
      <div className="mt-1">{children}</div>
    </div>
  );
}
