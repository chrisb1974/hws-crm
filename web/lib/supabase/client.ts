import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  // Lecture et verification a l'appel, jamais a l'import : rien ne doit
  // dependre des variables d'environnement au chargement du module.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY doivent etre definies.",
    );
  }

  return createBrowserClient(url, anonKey);
}
