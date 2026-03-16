"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { useAuth } from "../../hooks/useAuth";
import type { DashboardRow } from "../../lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

// ── Утилита группировки ───────────────────────────────────────────────────────
function groupBy<T>(items: T[], key: (item: T) => string): Record<string, T[]> {
  const result: Record<string, T[]> = {};
  for (const item of items) {
    const k = key(item);
    if (!result[k]) result[k] = [];
    result[k].push(item);
  }
  return result;
}

export default function AnalyticsListPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [dashboards, setDashboards] = useState<DashboardRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());

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
    if (!user) {
      router.push("/tools/analytics/new");
      return;
    }
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
    setDeleteTarget(null);
    setDashboards((d) => d.filter((db) => db.id !== id));
    try {
      const res = await fetch("/api/analytics/dashboards", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Не удалось удалить дашборд");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка удаления");
      setDashboards(prev);
    }
  };

  // ── D4: Дублировать дашборд ───────────────────────────────────────────────
  const handleDuplicate = async (db: DashboardRow) => {
    try {
      const res = await fetch("/api/analytics/dashboards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: db.name + " (копия)",
          data: db.data,
        }),
      });
      if (!res.ok) throw new Error("Не удалось дублировать дашборд");
      const created: DashboardRow = await res.json();
      setDashboards((prev) => [created, ...prev]);
      toast.success("Дашборд дублирован");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка дублирования");
    }
  };

  // ── S1: Отозвать публичную ссылку ─────────────────────────────────────────
  const handleRevokeShare = async (db: DashboardRow) => {
    try {
      const res = await fetch("/api/analytics/share", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: db.id }),
      });
      if (!res.ok) throw new Error("Не удалось отозвать ссылку");
      setDashboards((prev) =>
        prev.map((d) => (d.id === db.id ? { ...d, share_id: null } : d)),
      );
      toast.success("Публичная ссылка отозвана");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка отзыва ссылки");
    }
  };

  // ── F7: Переключение свёрнутости папки ────────────────────────────────────
  const toggleFolder = (folder: string) => {
    setCollapsedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folder)) next.delete(folder);
      else next.add(folder);
      return next;
    });
  };

  // ── Рендер: скелетон загрузки ─────────────────────────────────────────────
  if (user && (authLoading || !loaded)) {
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

  // ── F7: Группировка дашбордов по папкам ───────────────────────────────────
  const grouped = groupBy(dashboards, (d) => d.data?.folder || "");
  const folderNames = Object.keys(grouped).sort((a, b) => {
    // Пустая папка ("Без папки") всегда первая
    if (a === "") return -1;
    if (b === "") return 1;
    return a.localeCompare(b, "ru");
  });

  // ── Рендер одного дашборда ────────────────────────────────────────────────
  const renderDashboardCard = (db: DashboardRow) => {
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
              <>
                <a
                  href={`/share/${db.share_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Открыть публичную ссылку"
                  className="text-muted-foreground hover:text-primary transition-colors text-sm"
                >
                  🔗
                </a>
                <button
                  onClick={() => handleRevokeShare(db)}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                  aria-label="Отозвать публичную ссылку"
                >
                  Отозвать
                </button>
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDuplicate(db)}
              aria-label="Дублировать дашборд"
              className="text-muted-foreground hover:text-primary"
            >
              📋
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteTarget(db.id)}
              aria-label="Удалить дашборд"
              className="text-muted-foreground hover:text-destructive"
            >
              🗑
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

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

      {/* Список дашбордов, сгруппированных по папкам */}
      {dashboards.length > 0 && (
        <div className="space-y-4">
          {folderNames.map((folder) => {
            const items = grouped[folder];
            const isCollapsed = collapsedFolders.has(folder);

            // Без папки — рендерим список без заголовка секции
            if (folder === "") {
              return (
                <div key="__no_folder__" className="space-y-3">
                  {items.map(renderDashboardCard)}
                </div>
              );
            }

            // Папка — collapsible секция
            return (
              <div key={folder}>
                <button
                  onClick={() => toggleFolder(folder)}
                  className="flex items-center gap-2 mb-2 px-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full text-left"
                  aria-expanded={!isCollapsed}
                >
                  <svg
                    className={`h-4 w-4 shrink-0 transition-transform ${isCollapsed ? "" : "rotate-90"}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                  <span>📁 {folder}</span>
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {items.length}
                  </Badge>
                </button>
                {!isCollapsed && (
                  <div className="space-y-3 ml-6">
                    {items.map(renderDashboardCard)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Подтверждение удаления */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить дашборд?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Дашборд и все данные будут удалены.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
