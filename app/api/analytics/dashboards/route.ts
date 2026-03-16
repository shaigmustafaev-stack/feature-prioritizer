import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabase-server";
import type { DashboardRow } from "../../../lib/types";

async function getAuthUser(supabase: Awaited<ReturnType<typeof supabaseServer>>) {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function GET() {
  const supabase = await supabaseServer();
  const user = await getAuthUser(supabase);
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const { data, error } = await supabase
    .from("dashboards")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest) {
  const supabase = await supabaseServer();
  const user = await getAuthUser(supabase);
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const body = await request.json();

  const { data, error } = await supabase
    .from("dashboards")
    .insert({
      user_id: user.id,
      name: body.name ?? "Новый дашборд",
      data: body.data ?? { periods: [], metrics: [], insights: [] },
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data as DashboardRow);
}

export async function PUT(request: NextRequest) {
  const supabase = await supabaseServer();
  const user = await getAuthUser(supabase);
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const body = await request.json();
  const { id, ...fields } = body;

  if (!id) return NextResponse.json({ error: "id обязателен" }, { status: 400 });

  const updateData: Record<string, unknown> = {};
  if (fields.name !== undefined) updateData.name = fields.name;
  if (fields.data !== undefined) updateData.data = fields.data;

  const { data, error } = await supabase
    .from("dashboards")
    .update(updateData)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data as DashboardRow);
}

export async function DELETE(request: NextRequest) {
  const supabase = await supabaseServer();
  const user = await getAuthUser(supabase);
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const body = await request.json();
  const { id } = body;

  if (!id) return NextResponse.json({ error: "id обязателен" }, { status: 400 });

  const { error } = await supabase
    .from("dashboards")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
