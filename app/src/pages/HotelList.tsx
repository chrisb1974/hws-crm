import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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

const STATUS_COLOR: Record<string, string> = {
  prospect: "bg-amber-100 text-amber-800",
  onboarding: "bg-sky-100 text-sky-800",
  active: "bg-emerald-100 text-emerald-800",
  suspended: "bg-orange-100 text-orange-800",
  churned: "bg-neutral-200 text-neutral-600",
  program_only: "bg-violet-100 text-violet-800",
};

export function HotelList() {
  const { appUser } = useAuth();
  const canWrite = appUser?.role === "admin" || appUser?.role === "sales";

  const [rows, setRows] = useState<Property[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(async () => {
      let query = supabase
        .from("property")
        .select("*")
        .is("merged_into", null)
        .order("name")
        .limit(200);

      if (q.trim()) {
        query = query.ilike("name", `%${q.trim()}%`);
      }

      const { data, error } = await query;
      if (cancelled) return;
      if (error) setError(error.message);
      else {
        setError(null);
        setRows(data ?? []);
      }
      setLoading(false);
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [q]);

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Établissements</h1>
          <p className="text-sm text-muted">
            {rows.length} affiché{rows.length > 1 ? "s" : ""}
            {q ? ` pour « ${q} »` : ""}
          </p>
        </div>
        {canWrite && (
          <Link
            to="/hotels/new"
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-hover"
          >
            + Nouvel établissement
          </Link>
        )}
      </div>

      <input
        type="search"
        placeholder="Rechercher par nom…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="mt-4 w-full max-w-sm rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-brand"
      />

      {error && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="mt-4 overflow-hidden rounded-xl border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-line bg-paper text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Code</th>
              <th className="px-4 py-3 font-medium">Nom</th>
              <th className="px-4 py-3 font-medium">Ville</th>
              <th className="px-4 py-3 font-medium">Pays</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Chambres</th>
              <th className="px-4 py-3 font-medium">Statut</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted">
                  Chargement…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted">
                  Aucun établissement trouvé.
                </td>
              </tr>
            ) : (
              rows.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-line last:border-0 hover:bg-paper"
                >
                  <td className="px-4 py-3">
                    <Link
                      to={`/hotels/${p.id}`}
                      className="font-mono text-xs text-brand hover:underline"
                    >
                      {p.code}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`/hotels/${p.id}`} className="text-ink hover:underline">
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted">{p.city ?? "—"}</td>
                  <td className="px-4 py-3 text-muted">{p.country ?? "—"}</td>
                  <td className="px-4 py-3 text-muted">{p.property_type ?? "—"}</td>
                  <td className="px-4 py-3 text-muted">{p.rooms_total ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        STATUS_COLOR[p.lifecycle_status] ?? "bg-neutral-100 text-neutral-700"
                      }`}
                    >
                      {STATUS_LABEL[p.lifecycle_status] ?? p.lifecycle_status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
