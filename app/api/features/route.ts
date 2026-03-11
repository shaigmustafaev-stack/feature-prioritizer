import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "../../lib/supabase-server";
import type { Feature } from "../../lib/types";

const VALID_STATUSES = new Set(["new", "in-progress", "done", "deferred"]);

function validateFeatureBody(body: Record<string, unknown>): string | null {
  if (typeof body.name !== "string" || body.name.trim() === "") return "name обязателен";
  if (typeof body.reach !== "number" || body.reach < 0) return "reach должен быть числом >= 0";
  if (typeof body.impact !== "number") return "impact обязателен";
  if (typeof body.confidence !== "number") return "confidence обязателен";
  if (typeof body.effort !== "number" || body.effort <= 0) return "effort должен быть > 0";
  if (body.status !== undefined && !VALID_STATUSES.has(body.status as string)) {
    return `status должен быть одним из: ${[...VALID_STATUSES].join(", ")}`;
  }
  return null;
}

type SupabaseRow = {
  id: number;
  name: string;
  description: string;
  reach: number;
  impact: number;
  confidence: number;
  effort: number;
  status: string;
  user_id: string;
  created_at: string;
};

function toFeature(row: SupabaseRow): Feature {
  return {
    id: row.id,
    name: row.name,
    desc: row.description ?? "",
    reach: row.reach,
    impact: row.impact,
    confidence: row.confidence,
    effort: row.effort,
    status: row.status as Feature["status"],
  };
}

async function getAuthUser(supabase: Awaited<ReturnType<typeof supabaseServer>>) {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function GET() {
  const supabase = await supabaseServer();
  const user = await getAuthUser(supabase);
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const { data, error } = await supabase
    .from("features")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data ?? []).map(toFeature));
}

export async function POST(request: NextRequest) {
  const supabase = await supabaseServer();
  const user = await getAuthUser(supabase);
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const body = await request.json();
  const validationError = validateFeatureBody(body);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

  const { data, error } = await supabase
    .from("features")
    .insert({
      user_id: user.id,
      name: (body.name as string).trim(),
      description: body.description ?? "",
      reach: body.reach,
      impact: body.impact,
      confidence: body.confidence,
      effort: body.effort,
      status: body.status ?? "new",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(toFeature(data as SupabaseRow));
}

export async function PUT(request: NextRequest) {
  const supabase = await supabaseServer();
  const user = await getAuthUser(supabase);
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const body = await request.json();
  const { id, ...fields } = body;

  if (typeof id !== "number") return NextResponse.json({ error: "id обязателен" }, { status: 400 });
  if (fields.status !== undefined && !VALID_STATUSES.has(fields.status)) {
    return NextResponse.json({ error: `Невалидный status: ${fields.status}` }, { status: 400 });
  }

  const updateData: Record<string, string | number> = {};
  if (fields.name !== undefined) updateData.name = fields.name;
  if (fields.description !== undefined) updateData.description = fields.description;
  if (fields.reach !== undefined) updateData.reach = fields.reach;
  if (fields.impact !== undefined) updateData.impact = fields.impact;
  if (fields.confidence !== undefined) updateData.confidence = fields.confidence;
  if (fields.effort !== undefined) updateData.effort = fields.effort;
  if (fields.status !== undefined) updateData.status = fields.status;

  const { data, error } = await supabase
    .from("features")
    .update(updateData)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(toFeature(data as SupabaseRow));
}

export async function DELETE(request: NextRequest) {
  const supabase = await supabaseServer();
  const user = await getAuthUser(supabase);
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const body = await request.json();
  const { id, clearAll } = body;

  if (clearAll) {
    const { error } = await supabase
      .from("features")
      .delete()
      .eq("user_id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  const { error } = await supabase
    .from("features")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
