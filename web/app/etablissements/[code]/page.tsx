import { notFound } from "next/navigation";
import FicheClient from "@/components/fiche/fiche-client";
import { loadReferences } from "@/app/etablissements/[code]/actions";
import { createClient } from "@/lib/supabase/server";
import {
  CARD_COLUMNS,
  EDITABLE_COLUMNS,
  EDITABLE_FIELDS,
  type EditableValues,
  type PropertyCard,
} from "@/lib/property-card";

// Session Supabase lue a chaque requete : rien ne doit etre prerendu.
export const dynamic = "force-dynamic";

type Params = Promise<{ code: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

/** Le lien de retour ne peut etre qu'une chaine de requete interne. */
function backHrefFrom(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return "/etablissements";
  const decoded = decodeURIComponent(value);
  return decoded.startsWith("?") ? `/etablissements${decoded}` : "/etablissements";
}

export default async function FichePage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { code } = await params;
  const query = await searchParams;
  const supabase = await createClient();

  // Une seule requete pour l'en-tete, le croquis et les indicateurs.
  const { data: card, error } = await supabase
    .from("v_property_card")
    .select(CARD_COLUMNS)
    .eq("code", decodeURIComponent(code))
    .maybeSingle();

  if (error) {
    return (
      <div className="px-6 py-10">
        <p role="alert" className="rounded-md border border-danger/30 bg-danger-fond px-4 py-3 text-[13px] text-danger">
          La fiche n&apos;a pas pu être chargée.{" "}
          <span className="font-mono text-[12px]">{error.message}</span>
        </p>
      </div>
    );
  }
  if (!card) notFound();

  const typed = card as unknown as PropertyCard;

  // v_property_card expose les libelles mais pas tous les identifiants
  // modifiables : la table donne les valeurs brutes a editer. Lecture seule.
  const { data: raw } = await supabase
    .from("property")
    .select(EDITABLE_COLUMNS)
    .eq("id", typed.id)
    .maybeSingle();

  const source = (raw ?? {}) as Record<string, string | number | null>;
  const initialValues = Object.fromEntries(
    EDITABLE_FIELDS.map((field) => [field, source[field] ?? null]),
  ) as EditableValues;

  const references = await loadReferences();

  return (
    <FicheClient
      card={typed}
      initialValues={initialValues}
      references={references}
      backHref={backHrefFrom(query.retour)}
    />
  );
}
