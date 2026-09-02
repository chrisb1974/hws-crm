import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Session Supabase lue a chaque requete : rien ne doit etre prerendu.
export const dynamic = "force-dynamic";

/**
 * Retour du lien magique. Supabase envoie soit `?code=` (flux PKCE, le cas par
 * defaut avec @supabase/ssr), soit `?token_hash=&type=` si le gabarit d'e-mail
 * a ete personnalise. Les deux sont acceptes pour que la connexion marche quel
 * que soit le gabarit configure dans le projet.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const requested = searchParams.get("suite") ?? searchParams.get("next");
  // On n'accepte qu'un chemin interne : jamais une URL fournie dans le lien.
  const suite = requested && requested.startsWith("/") && !requested.startsWith("//")
    ? requested
    : "/etablissements";

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(suite, origin));
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(suite, origin));
  }

  const failure = new URL("/login", origin);
  failure.searchParams.set("erreur", "lien");
  return NextResponse.redirect(failure);
}
