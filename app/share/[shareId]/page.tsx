import { notFound } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { DashboardViewWrapper } from "./DashboardViewWrapper";
import { migratePeriod } from "../../lib/utils";
import type { DashboardRow } from "../../lib/types";

interface PageProps {
  params: Promise<{ shareId: string }>;
}

export default async function SharePage({ params }: PageProps) {
  const { shareId } = await params;

  // Создаём Supabase клиент для сервера
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  // Запрашиваем дашборд по share_id
  const { data, error } = await supabase
    .from("dashboards")
    .select("*")
    .eq("share_id", shareId)
    .single();

  if (error || !data) {
    notFound();
  }

  const row = data as DashboardRow;

  return (
    <div className="mx-auto max-w-[860px] px-4 py-8">
      {/* Заголовок */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">{row.name}</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Создано в ProductHub
        </p>
      </div>

      {/* Дашборд (клиентский компонент — recharts требует браузер) */}
      <DashboardViewWrapper
        metrics={row.data?.metrics ?? []}
        periods={(row.data?.periods ?? []).map(migratePeriod)}
        insights={row.data?.insights ?? []}
        notes={row.data?.notes ?? {}}
      />
    </div>
  );
}
