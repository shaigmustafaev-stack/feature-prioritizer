"use client";

import { use } from "react";
import { useAuth } from "../../../hooks/useAuth";
import { useAnalytics } from "../../../hooks/useAnalytics";
import { MetricInput } from "../../../components/MetricInput";
import { DashboardView } from "../../../components/DashboardView";
import { ShareModal } from "../../../components/ShareModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { Metric } from "../../../lib/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function DashboardEditorPage({ params }: PageProps) {
  const { id } = use(params);
  const { user, loading: authLoading } = useAuth();
  const {
    dashboard,
    loading,
    analyzing,
    error,
    activeTab,
    setActiveTab,
    shareModalId,
    setShareModalId,
    updateDashboard,
    addMetric,
    removeMetric,
    updateMetric,
    addPeriod,
    removePeriod,
    analyze,
    save,
    share,
  } = useAnalytics(id, user);

  // ── Загрузка ──────────────────────────────────────────────────────────────
  if (authLoading || loading) {
    return (
      <div className="mx-auto max-w-[860px] px-4 py-8 space-y-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-9 flex-1 animate-pulse rounded bg-muted" />
          <div className="h-9 w-24 animate-pulse rounded bg-muted" />
          <div className="h-9 w-24 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-10 w-48 animate-pulse rounded bg-muted" />
        {[1, 2].map((i) => (
          <div key={i} className="h-40 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    );
  }

  // ── Нет авторизации ───────────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="mx-auto max-w-[860px] px-4 py-8 text-center text-muted-foreground">
        <p>Войдите, чтобы редактировать дашборд</p>
      </div>
    );
  }

  // ── Дашборд не найден / ошибка ────────────────────────────────────────────
  if (!dashboard) {
    return (
      <div className="mx-auto max-w-[860px] px-4 py-8">
        <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
          {error ?? "Дашборд не найден"}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[860px] px-4 py-8">
      {/* Заголовок с редактируемым именем */}
      <div className="mb-6 flex items-center gap-3 flex-wrap">
        <Input
          value={dashboard.name}
          onChange={(e) => updateDashboard({ name: e.target.value })}
          className="flex-1 min-w-[200px] text-base font-medium"
          placeholder="Название дашборда"
          aria-label="Название дашборда"
        />
        <Button variant="outline" onClick={save}>
          Сохранить
        </Button>
        <Button variant="outline" onClick={share}>
          🔗 Поделиться
        </Button>
      </div>

      {/* Ошибка */}
      {error && (
        <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Вкладки */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          if (v) setActiveTab(v as "data" | "dashboard");
        }}
      >
        <TabsList className="mb-6">
          <TabsTrigger value="data">Данные</TabsTrigger>
          <TabsTrigger value="dashboard">Дашборд</TabsTrigger>
        </TabsList>

        {/* ── Вкладка: Данные ──────────────────────────────────────────────── */}
        <TabsContent value="data">
          <div className="space-y-4">
            {/* Список метрик */}
            {dashboard.metrics.map((metric: Metric) => (
              <MetricInput
                key={metric.id}
                metric={metric}
                periods={dashboard.periods}
                onUpdate={updateMetric}
                onRemove={() => removeMetric(metric.id)}
              />
            ))}

            {/* Пустое состояние */}
            {dashboard.metrics.length === 0 && (
              <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
                <p className="text-base">Добавьте метрику и периоды для анализа</p>
                <p className="text-sm mt-1">
                  Например: DAU, Revenue, Retention
                </p>
              </div>
            )}

            {/* Панель управления: добавить метрику / период */}
            <div className="flex flex-wrap gap-2 pt-2">
              <Button variant="outline" onClick={addMetric}>
                + Добавить метрику
              </Button>
              <Button variant="outline" onClick={addPeriod}>
                + Добавить период
              </Button>
              {dashboard.periods.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => removePeriod(dashboard.periods.length - 1)}
                >
                  − Убрать последний период
                </Button>
              )}
            </div>

            {/* Кнопка анализа */}
            {dashboard.metrics.length > 0 && dashboard.periods.length > 0 && (
              <Button
                className="w-full h-11 text-base font-semibold"
                onClick={analyze}
                disabled={analyzing}
              >
                {analyzing ? "Анализируем..." : "✨ Анализировать"}
              </Button>
            )}
          </div>
        </TabsContent>

        {/* ── Вкладка: Дашборд ─────────────────────────────────────────────── */}
        <TabsContent value="dashboard">
          <DashboardView
            metrics={dashboard.metrics}
            periods={dashboard.periods}
            insights={dashboard.insights}
            analyzing={analyzing}
          />
        </TabsContent>
      </Tabs>

      {/* Модал поделиться */}
      <ShareModal
        shareId={shareModalId}
        onClose={() => setShareModalId(null)}
      />
    </div>
  );
}
