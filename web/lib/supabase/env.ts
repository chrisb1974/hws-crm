/**
 * Les deux variables sont publiques (cle anon). La RLS est la seule barriere :
 * sans session valide, v_property_list renvoie zero ligne.
 */
export function supabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY doivent etre definies (.env.local).",
    );
  }
  return { url, anonKey };
}
