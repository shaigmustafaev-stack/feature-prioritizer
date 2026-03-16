import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabase-server";
import type { DashboardRow } from "../../../lib/types";

async function getAuthUser(supabase: Awaited<ReturnType<typeof supabaseServer>>) {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function POST(request: NextRequest) {
  const supabase = await supabaseServer();
  const user = await getAuthUser(supabase);
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const body = await request.json();
  const { id } = body as { id: string };

  if (!id) return NextResponse.json({ error: "id обязателен" }, { status: 400 });

  // Fetch existing dashboard to check for existing share_id
  const { data: existing, error: fetchError } = await supabase
    .from("dashboards")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Дашборд не найден" }, { status: 404 });
  }

  const dashboard = existing as DashboardRow;

  // Return existing share_id if already set
  if (dashboard.share_id) {
    return NextResponse.json({ shareId: dashboard.share_id });
  }

  // Generate new share_id
  const shareId =
    Math.random().toString(36).substring(2, 10) +
    Math.random().toString(36).substring(2, 10);

  const { error: updateError } = await supabase
    .from("dashboards")
    .update({ share_id: shareId })
    .eq("id", id)
    .eq("user_id", user.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ shareId });
}

export async function DELETE(request: NextRequest) {
  const supabase = await supabaseServer();
  const user = await getAuthUser(supabase);
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const body = await request.json();
  const { id } = body as { id: string };
  if (!id) return NextResponse.json({ error: "id обязателен" }, { status: 400 });

  const { error } = await supabase
    .from("dashboards")
    .update({ share_id: null })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
