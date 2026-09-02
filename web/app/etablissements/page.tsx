import PropertyExplorer from "@/components/property-explorer";
import { createClient } from "@/lib/supabase/server";
import { t } from "@/lib/i18n";
import type { PropertyRow } from "@/lib/types";

/**
 * Source unique : la vue v_property_list. Aucune jointure, aucun calcul.
 *
 * Le portefeuille tient en quelques centaines de lignes et la vue est deja
 * agregee : on la lit en une fois cote serveur (PostgREST plafonne a 1000
 * lignes par requete, d'ou la boucle), puis l'ecran pagine par 50. Le compteur
 * total reste donc exact quelle que soit la combinaison vue + filtres.
 */
const CHUNK = 1000;
const MAX_CHUNKS = 20;

async function fetchProperties(): Promise<{ rows: PropertyRow[]; error: string | null }> {
  const supabase = await createClient();
  const rows: PropertyRow[] = [];

  for (let chunk = 0; chunk < MAX_CHUNKS; chunk += 1) {
    const from = chunk * CHUNK;
    const { data, error } = await supabase
      .from("v_property_list")
      .select("*")
      .order("code", { ascending: true })
      .range(from, from + CHUNK - 1);

    if (error) return { rows, error: error.message };
    if (!data || data.length === 0) break;

    rows.push(...(data as PropertyRow[]));
    if (data.length < CHUNK) break;
  }

  return { rows, error: null };
}

export default async function PropertiesPage() {
  const { rows, error } = await fetchProperties();

  if (error) {
    return (
      <div className="px-6 py-10">
        <p
          role="alert"
          className="rounded-md border border-danger/30 bg-danger-fond px-4 py-3 text-[13px] text-danger"
        >
          {t.list.loadError} <span className="font-mono text-[12px]">{error}</span>
        </p>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="px-6 py-10">
        <p className="rounded-md border border-bordure bg-surface px-4 py-3 text-[13px] text-encre-75">
          {t.list.emptyAuth}
        </p>
      </div>
    );
  }

  return <PropertyExplorer rows={rows} />;
}
