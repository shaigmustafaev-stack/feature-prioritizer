import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "../../lib/supabase-server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const raw = request.nextUrl.searchParams.get("next") ?? "/";

  // Защита от open redirect — только относительные пути на наш домен
  const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";

  if (code) {
    const supabase = await supabaseServer();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL(next, request.url));
}
