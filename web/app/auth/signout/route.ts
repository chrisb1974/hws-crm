import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const target = new URL("/login", request.url);
  target.searchParams.set("deconnecte", "1");
  // 303 : la redirection qui suit un POST doit repartir en GET.
  return NextResponse.redirect(target, 303);
}
