import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseEnv } from "@/lib/supabase/env";

/**
 * Un client par rendu, jamais partage entre requetes (cf. @supabase/ssr).
 * `setAll` echoue silencieusement depuis un Server Component : c'est attendu,
 * proxy.ts a deja rafraichi la session et ecrit les cookies sur la reponse.
 */
export async function createClient() {
  const { url, anonKey } = supabaseEnv();
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
