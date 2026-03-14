"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Dashboard, DashboardRow, Metric, Period, Insight } from "../lib/types";
import { migratePeriod } from "../lib/utils";

// Минимальный тип пользователя — не импортируем весь @supabase/supabase-js
type AuthUser = { id: string; email?: string | null };

// ─── Вспомогательные функции ──────────────────────────────────────────────────

function createEmptyMetric(): Metric {
  return { id: crypto.randomUUID(), name: "", rows: [{ label: "", values: [] }] };
}

function createDefaultPeriod(): Period {
  const now = new Date();
  return { label: now.toLocaleDateString("ru-RU", { month: "short", year: "2-digit" }) };
}

function normalizeDashboardRow(row: DashboardRow): Dashboard {
  return {
    id: row.id,
    name: row.name,
    periods: (row.data?.periods ?? []).map(migratePeriod),
    metrics: row.data?.metrics ?? [],
    insights: row.data?.insights ?? [],
    created_at: row.created_at,
    user_id: row.user_id,
    share_id: row.share_id ?? undefined,
  };
}

// ─── Хук useAnalytics ─────────────────────────────────────────────────────────

export function useAnalytics(dashboardId: string, user: AuthUser | null) {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"data" | "dashboard">("data");
  const [shareModalId, setShareModalId] = useState<string | null>(null);

  // Ref для избежания stale closure в autoSave
  const dashboardRef = useRef<Dashboard | null>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Загрузка ──────────────────────────────────────────────────────────────
  useEffect(() => {
    // Анонимный режим: локальный пустой дашборд
    if (!user) {
      if (dashboardId === "new") {
        const local: Dashboard = {
          id: "new",
          name: "Новый дашборд",
          periods: [],
          metrics: [],
          insights: [],
          created_at: new Date().toISOString(),
          user_id: "",
        };
        setDashboard(local);
        dashboardRef.current = local;
      }
      setLoading(false);
      return;
    }

    // Авторизованный режим: загрузка из API
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/analytics/dashboards");
        if (!res.ok) throw new Error("Не удалось загрузить дашборды");
        const rows: DashboardRow[] = await res.json();
        const found = rows.find((r) => r.id === dashboardId);
        if (!found) throw new Error("Дашборд не найден");
        const normalized = normalizeDashboardRow(found);
        setDashboard(normalized);
        dashboardRef.current = normalized;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ошибка загрузки");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [dashboardId, user]);

  // ── Авто-сохранение (дебаунс 5 сек) ──────────────────────────────────────
  const triggerAutoSave = useCallback(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      const current = dashboardRef.current;
      if (!current || !user) return;
      try {
        await fetch("/api/analytics/dashboards", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: current.id,
            name: current.name,
            data: {
              periods: current.periods,
              metrics: current.metrics,
              insights: current.insights,
            },
          }),
        });
      } catch {
        // Тихая ошибка при авто-сохранении
      }
    }, 5000);
  }, [user]);

  // ── Обновить весь дашборд ─────────────────────────────────────────────────
  const updateDashboard = useCallback(
    (updates: Partial<Dashboard>) => {
      setDashboard((prev) => {
        if (!prev) return prev;
        const next = { ...prev, ...updates };
        dashboardRef.current = next;
        return next;
      });
      triggerAutoSave();
    },
    [triggerAutoSave]
  );

  // ── Метрики ───────────────────────────────────────────────────────────────
  const addMetric = useCallback(() => {
    setDashboard((prev) => {
      if (!prev) return prev;
      const newMetric = createEmptyMetric();
      // Инициализируем values пустыми нулями для всех существующих периодов
      newMetric.rows = [{ label: "", values: prev.periods.map(() => 0) }];
      const next = { ...prev, metrics: [...prev.metrics, newMetric] };
      dashboardRef.current = next;
      return next;
    });
    triggerAutoSave();
  }, [triggerAutoSave]);

  const removeMetric = useCallback(
    (metricId: string) => {
      setDashboard((prev) => {
        if (!prev) return prev;
        const next = {
          ...prev,
          metrics: prev.metrics.filter((m) => m.id !== metricId),
          insights: prev.insights.filter((ins) => ins.metricId !== metricId),
        };
        dashboardRef.current = next;
        return next;
      });
      triggerAutoSave();
    },
    [triggerAutoSave]
  );

  const updateMetric = useCallback(
    (metric: Metric) => {
      setDashboard((prev) => {
        if (!prev) return prev;
        const next = {
          ...prev,
          metrics: prev.metrics.map((m) => (m.id === metric.id ? metric : m)),
        };
        dashboardRef.current = next;
        return next;
      });
      triggerAutoSave();
    },
    [triggerAutoSave]
  );

  // ── Периоды ───────────────────────────────────────────────────────────────
  const addPeriod = useCallback(() => {
    setDashboard((prev) => {
      if (!prev) return prev;
      let newPeriod: Period;
      if (prev.periods.length === 0) {
        newPeriod = createDefaultPeriod();
      } else {
        const periodNum = prev.periods.length + 1;
        newPeriod = { label: `Период ${periodNum}` };
      }

      // Добавляем 0 во все строки всех метрик для нового периода
      const updatedMetrics = prev.metrics.map((m) => ({
        ...m,
        rows: m.rows.map((row) => ({
          ...row,
          values: [...row.values, 0],
        })),
      }));

      const next = {
        ...prev,
        periods: [...prev.periods, newPeriod],
        metrics: updatedMetrics,
      };
      dashboardRef.current = next;
      return next;
    });
    triggerAutoSave();
  }, [triggerAutoSave]);

  const removePeriod = useCallback(
    (periodIdx: number) => {
      setDashboard((prev) => {
        if (!prev) return prev;
        // Каскадное удаление значений из всех строк всех метрик
        const updatedMetrics = prev.metrics.map((m) => ({
          ...m,
          rows: m.rows.map((row) => ({
            ...row,
            values: row.values.filter((_, i) => i !== periodIdx),
          })),
        }));

        const next = {
          ...prev,
          periods: prev.periods.filter((_, i) => i !== periodIdx),
          metrics: updatedMetrics,
        };
        dashboardRef.current = next;
        return next;
      });
      triggerAutoSave();
    },
    [triggerAutoSave]
  );

  // ── Анализ ────────────────────────────────────────────────────────────────
  const analyze = useCallback(async (): Promise<"needs-auth" | void> => {
    if (!user) return "needs-auth";
    if (!dashboard) return;
    setAnalyzing(true);
    setError(null);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30_000);
      const res = await fetch("/api/analytics/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dashboardId: dashboard.id,
          metrics: dashboard.metrics,
          periods: dashboard.periods,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) throw new Error("Не удалось сгенерировать аналитику");
      const { insights } = await res.json();

      // Обновляем состояние и принудительно сохраняем
      setDashboard((prev) => {
        if (!prev) return prev;
        const next = { ...prev, insights };
        dashboardRef.current = next;
        return next;
      });

      // Принудительное немедленное сохранение
      const current = dashboardRef.current;
      if (current) {
        await fetch("/api/analytics/dashboards", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: current.id,
            name: current.name,
            data: {
              periods: current.periods,
              metrics: current.metrics,
              insights,
            },
          }),
        });
      }

      setActiveTab("dashboard");
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        setError("AI-анализ не ответил за 30 секунд. Попробуйте ещё раз.");
      } else {
        setError(e instanceof Error ? e.message : "Ошибка анализа");
      }
    } finally {
      setAnalyzing(false);
    }
  }, [dashboard, user]);

  // ── Ручное сохранение ─────────────────────────────────────────────────────
  const save = useCallback(async (): Promise<"needs-auth" | void> => {
    if (!user) return "needs-auth";
    const current = dashboardRef.current;
    if (!current) return;
    try {
      const res = await fetch("/api/analytics/dashboards", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: current.id,
          name: current.name,
          data: {
            periods: current.periods,
            metrics: current.metrics,
            insights: current.insights,
          },
        }),
      });
      if (!res.ok) throw new Error("Не удалось сохранить дашборд");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка сохранения");
    }
  }, [user]);

  // ── Поделиться ────────────────────────────────────────────────────────────
  const share = useCallback(async (): Promise<"needs-auth" | void> => {
    if (!user) return "needs-auth";
    const current = dashboardRef.current;
    if (!current) return;
    try {
      const res = await fetch("/api/analytics/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: current.id }),
      });
      if (!res.ok) throw new Error("Не удалось создать ссылку");
      const { shareId } = await res.json();
      setShareModalId(shareId);
      // Обновляем share_id в state
      setDashboard((prev) => {
        if (!prev) return prev;
        const next = { ...prev, share_id: shareId };
        dashboardRef.current = next;
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка создания ссылки");
    }
  }, [user]);

  return {
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
  };
}
