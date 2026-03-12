"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../hooks/useAuth";
import type { DashboardRow } from "../../lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AnalyticsListPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [dashboards, setDashboards] = useState<DashboardRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Загрузка списка дашбордов ─────────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoaded(true);
      return;
    }

    const load = async () => {
      try {
        const res = await fetch("/api/analytics/dashboards");
        if (!res.ok) throw new Error("Не удалось загрузить дашборды");
        const data: DashboardRow[] = await res.json();
        setDashboards(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ошибка загрузки");
      } finally {
        setLoaded(true);
      }
    };

    load();
  }, [user, authLoading]);

  // ── Создать новый дашборд ─────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!user) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/analytics/dashboards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Новый дашборд" }),
      });
      if (!res.ok) throw new Error("Не удалось создать дашборд");
      const data: DashboardRow = await res.json();
      router.push(`/tools/analytics/${data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка создания");
      setCreating(false);
    }
  };

  // ── Удалить дашборд ───────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    const prev = dashboards;
    setDashboards((d) => d.filter((db) => db.id !== id));
    try {
      const res = await fetch(`/api/analytics/dashboards/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Не удалось удалить дашборд");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка удаления");
      setDashboards(prev);
    }
  };

  // ── Рендер: не авторизован ────────────────────────────────────────────────
  if (!authLoading && !user) {
    return (
      <div className="mx-auto max-w-[860px] px-4 py-8">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="text-4xl">📊</div>
            <h2 className="text-lg font-semibold">Войдите, чтобы использовать аналитику</h2>
            <p className="text-sm text-muted-foreground">
              Дашборды сохраняются в вашем аккаунте и доступны на любом устройстве
            </p>
            <Link href="/login">
              <Button>Войти</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Рендер: скелетон загрузки ─────────────────────────────────────────────
  if (authLoading || !loaded) {
    return (
      <div className="mx-auto max-w-[860px] px-4 py-8 space-y-3">
        <div className="flex items-center justify-between mb-6">
          <div className="h-7 w-48 animate-pulse rounded bg-muted" />
          <div className="h-9 w-36 animate-pulse rounded bg-muted" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[860px] px-4 py-8">
      {/* Заголовок */}
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">📊 Аналитика продукта</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Дашборды метрик с графиками и AI-выводами
          </p>
        </div>
        <Button onClick={handleCreate} disabled={creating}>
          {creating ? "Создание..." : "+ Новый дашборд"}
        </Button>
      </div>

      {/* Ошибка */}
      {error && (
        <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Пустое состояние */}
      {dashboards.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="text-4xl">📈</div>
            <h2 className="text-lg font-semibold">Создайте первый дашборд</h2>
            <p className="text-sm text-muted-foreground">
              Добавьте метрики, внесите данные и получите AI-анализ
            </p>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? "Создание..." : "Создать дашборд"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Список дашбордов */}
      {dashboards.length > 0 && (
        <div className="space-y-3">
          {dashboards.map((db) => {
            const metricsCount = db.data?.metrics?.length ?? 0;
            const date = new Date(db.created_at).toLocaleDateString("ru-RU", {
              day: "numeric",
              month: "short",
              year: "numeric",
            });

            return (
              <Card key={db.id} className="group">
                <CardContent className="flex items-center gap-4 py-4">
                  {/* Название и мета */}
                  <Link
                    href={`/tools/analytics/${db.id}`}
                    className="min-w-0 flex-1 no-underline"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                        {db.name}
                      </span>
                      <Badge variant="secondary">
                        {metricsCount} {metricsCount === 1 ? "метрика" : metricsCount < 5 ? "метрики" : "метрик"}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{date}</p>
                  </Link>

                  {/* Действия */}
                  <div className="flex items-center gap-2 shrink-0">
                    {db.share_id && (
                      <a
                        href={`/share/${db.share_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Открыть публичную ссылку"
                        className="text-muted-foreground hover:text-primary transition-colors text-sm"
                      >
                        🔗
                      </a>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(db.id)}
                      aria-label="Удалить дашборд"
                      className="text-muted-foreground hover:text-destructive"
                    >
                      🗑
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
