"use client";

import { use, useState, useRef } from "react";
import { toast } from "sonner";
import { useAuth } from "../../../hooks/useAuth";
import { useAnalytics } from "../../../hooks/useAnalytics";
import { MetricInput } from "../../../components/MetricInput";
import { DashboardView } from "../../../components/DashboardView";
import { ShareModal } from "../../../components/ShareModal";
import { AuthGateDialog } from "../../../components/AuthGateDialog";
import { CsvUploadButton } from "../../../components/CsvUploadButton";
import { ExportPdfButton } from "../../../components/ExportPdfButton";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Metric, Period } from "../../../lib/types";

function SortableMetric({ metric, ...props }: { metric: Metric } & Omit<React.ComponentProps<typeof MetricInput>, "metric">) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: metric.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-1">
      <div {...attributes} {...listeners} className="mt-5 flex-shrink-0 w-6 flex items-center justify-center cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground" aria-label="Перетащить">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-4">
          <circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/>
          <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
          <circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/>
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <MetricInput metric={metric} {...props} />
      </div>
    </div>
  );
}

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
    updatePeriod,
    analyze,
    save,
    share,
    addPeriodsFromTemplate,
    updateNote,
    updateInsight,
    dashboardSummary,
    reorderMetrics,
  } = useAnalytics(id, user);

  const [showAuthGate, setShowAuthGate] = useState(false);
  const dashboardContentRef = useRef<HTMLDivElement>(null);

  const handleCsvImport = (metrics: Metric[], periods: Period[]) => {
    updateDashboard({ metrics, periods, insights: [] });
  };

  const handleAnalyze = async () => {
    const result = await analyze();
    if (result === "needs-auth") { setShowAuthGate(true); return; }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSave = async () => {
    const result = await save();
    if (result === "needs-auth") { setShowAuthGate(true); return; }
    toast.success("Сохранено \u2713");
  };

  const handleShare = async () => {
    const result = await share();
    if (result === "needs-auth") { setShowAuthGate(true); return; }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (!dashboard) return;
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const ids = dashboard.metrics.map(m => m.id);
      const oldIndex = ids.indexOf(active.id as string);
      const newIndex = ids.indexOf(over.id as string);
      const newIds = [...ids];
      newIds.splice(oldIndex, 1);
      newIds.splice(newIndex, 0, active.id as string);
      reorderMetrics(newIds);
    }
  };

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
      {/* Кнопка назад */}
      <Link
        href="/tools/analytics"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        ← Назад к дашбордам
      </Link>

      {/* Заголовок с редактируемым именем */}
      <div className="mb-6 flex items-center gap-3 flex-wrap">
        <Input
          value={dashboard.name}
          onChange={(e) => updateDashboard({ name: e.target.value })}
          className="flex-1 min-w-[200px] text-base font-medium"
          placeholder="Название дашборда"
          aria-label="Название дашборда"
        />
        <Button variant="outline" className="min-h-11" onClick={handleSave}>
          Сохранить
        </Button>
        {id !== "new" && dashboard.metrics.length > 0 && (
          <>
            <Button variant="outline" className="min-h-11" onClick={handleShare}>
              🔗 Поделиться
            </Button>
            <ExportPdfButton dashboardRef={dashboardContentRef} fileName={dashboard.name} />
          </>
        )}
      </div>

      {/* Описание дашборда */}
      <textarea
        value={dashboard.description ?? ""}
        onChange={(e) => updateDashboard({ description: e.target.value })}
        placeholder="Описание дашборда (необязательно)"
        className="w-full text-sm resize-none rounded-lg border bg-transparent px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring mb-4"
        rows={2}
      />

      {/* Ошибка */}
      {error && (
        <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Баннер авторизации */}
      {!user && !authLoading && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          ⚠️ Вы не авторизованы. Данные не будут сохранены.{" "}
          <button type="button" onClick={() => setShowAuthGate(true)} className="underline font-medium hover:no-underline">
            Войти
          </button>
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
          <TabsTrigger value="data" className="gap-2 px-4 text-sm font-medium">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-4"><path d="M3 3h18v18H3z"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>
            Данные
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="gap-2 px-4 text-sm font-medium">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-4"><path d="M3 3v18h18"/><path d="M7 16l4-8 4 4 4-6"/></svg>
            Дашборд
          </TabsTrigger>
        </TabsList>

        {/* ── Вкладка: Данные ──────────────────────────────────────────────── */}
        <TabsContent value="data">
          <div className="space-y-4">
            {/* Список метрик */}
            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={dashboard.metrics.map(m => m.id)} strategy={verticalListSortingStrategy}>
                {dashboard.metrics.map((metric: Metric) => (
                  <SortableMetric
                    key={metric.id}
                    metric={metric}
                    periods={dashboard.periods}
                    onUpdate={updateMetric}
                    onRemove={() => removeMetric(metric.id)}
                    onRemovePeriod={removePeriod}
                    onUpdatePeriod={updatePeriod}
                  />
                ))}
              </SortableContext>
            </DndContext>

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
              <Button variant="outline" className="min-h-11" onClick={addMetric}>
                + Добавить метрику
              </Button>
              <Button variant="outline" className="min-h-11" onClick={addPeriod}>
                + Добавить период
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button variant="outline" className="min-h-11" />}>
                  📅 Шаблон периодов
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => addPeriodsFromTemplate("quarters")}>
                    Кварталы (Q1-Q4)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => addPeriodsFromTemplate("months-6")}>
                    6 месяцев
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => addPeriodsFromTemplate("months-12")}>
                    12 месяцев
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <CsvUploadButton onImport={handleCsvImport} />
            </div>

            {/* Кнопка анализа */}
            {dashboard.metrics.length > 0 && dashboard.periods.length > 0 && (
              <Button
                className="w-full h-11 text-base font-semibold"
                onClick={handleAnalyze}
                disabled={analyzing}
              >
                {analyzing ? "Анализируем..." : "✨ Анализировать"}
              </Button>
            )}
          </div>
        </TabsContent>

        {/* ── Вкладка: Дашборд ─────────────────────────────────────────────── */}
        <TabsContent value="dashboard">
          <div ref={dashboardContentRef}>
          <DashboardView
            metrics={dashboard.metrics}
            periods={dashboard.periods}
            insights={dashboard.insights}
            analyzing={analyzing}
            notes={dashboard.notes}
            onNoteChange={updateNote}
            onInsightEdit={(metricId, field, value) => updateInsight(metricId, { [field]: value })}
          />
          </div>
        </TabsContent>
      </Tabs>

      {/* Модал поделиться */}
      <ShareModal
        shareId={shareModalId}
        onClose={() => setShareModalId(null)}
      />

      {/* Модал авторизации */}
      <AuthGateDialog open={showAuthGate} onClose={() => setShowAuthGate(false)} />
    </div>
  );
}
