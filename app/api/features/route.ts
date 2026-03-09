import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../lib/supabase";
import type { Feature } from "../../lib/types";

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

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("user_id");
  if (!userId) {
    return NextResponse.json({ error: "user_id обязателен" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("features")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data ?? []).map(toFeature));
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const { data, error } = await supabase
    .from("features")
    .insert({
      user_id: body.user_id,
      name: body.name,
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
  const body = await request.json();
  const { id, user_id, ...fields } = body;

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
    .eq("user_id", user_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(toFeature(data as SupabaseRow));
}

export async function DELETE(request: NextRequest) {
  const body = await request.json();
  const { id, user_id, clearAll } = body;

  if (clearAll) {
    const { error } = await supabase
      .from("features")
      .delete()
      .eq("user_id", user_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  const { error } = await supabase
    .from("features")
    .delete()
    .eq("id", id)
    .eq("user_id", user_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
