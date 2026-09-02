import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Un client par rendu, jamais partage entre requetes (cf. @supabase/ssr).
 * `setAll` echoue silencieusement depuis un Server Component : c'est attendu,
 * proxy.ts a deja rafraichi la session et ecrit les cookies sur la reponse.
 *
 * Les deux variables sont publiques (cle anon) ; la RLS est la seule barriere.
 */
export async function createClient() {
  // Lecture et verification a l'appel, jamais a l'import.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY doivent etre definies.",
    );
  }

  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Component : ecriture de cookies impossible, on laisse faire proxy.ts.
        }
      },
    },
  });
}
