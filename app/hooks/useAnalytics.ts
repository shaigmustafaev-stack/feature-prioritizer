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
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yy = String(now.getFullYear()).slice(-2);
  return { label: `${dd}.${mm}.${yy}` };
}

/** Парсит краткий месяц-год ("янв. 25") и возвращает следующий месяц в том же формате.
 *  periodIndex — порядковый номер нового периода (для fallback-смещения) */
function parseAndAdvanceMonth(label: string, periodIndex: number): string {
  const months = ["янв.", "февр.", "мар.", "апр.", "мая", "июн.", "июл.", "авг.", "сент.", "окт.", "нояб.", "дек."];
  const lower = label.toLowerCase().trim();
  const idx = months.findIndex((m) => lower.startsWith(m));
  if (idx === -1) {
    // Не удалось распарсить — fallback: текущий месяц + смещение на номер периода
    const now = new Date();
    now.setMonth(now.getMonth() + periodIndex);
    const dd2 = String(now.getDate()).padStart(2, '0');
    const mm2 = String(now.getMonth() + 1).padStart(2, '0');
    const yy2 = String(now.getFullYear()).slice(-2);
    return `${dd2}.${mm2}.${yy2}`;
  }
  const yearMatch = lower.match(/(\d{2,4})$/);
  let year = yearMatch ? parseInt(yearMatch[1], 10) : new Date().getFullYear() % 100;
  let nextMonth = idx + 1;
  if (nextMonth > 11) {
    nextMonth = 0;
    year += 1;
  }
  const d = new Date(2000 + (year < 100 ? year : year - 2000), nextMonth, 1);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}.${mm}.${yy}`;
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
    // Новый дашборд — создаём локально (для анонимных и авторизованных)
    if (dashboardId === "new") {
      const local: Dashboard = {
        id: "new",
        name: "Новый дашборд",
        periods: [],
        metrics: [],
        insights: [],
        created_at: new Date().toISOString(),
        user_id: user?.id ?? "",
      };
      setDashboard(local);
      dashboardRef.current = local;
      setLoading(false);
      return;
    }

    // Анонимный режим без конкретного дашборда
    if (!user) {
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

  // ── Немедленное сохранение (flush) при уходе со страницы ─────────────────
  const flushSave = useCallback(() => {
    const current = dashboardRef.current;
    if (!current || !user) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    // sendBeacon для надёжной отправки при закрытии вкладки
    const payload = JSON.stringify({
      id: current.id,
      name: current.name,
      data: {
        periods: current.periods,
        metrics: current.metrics,
        insights: current.insights,
      },
    });
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon("/api/analytics/dashboards?_method=PUT", blob);
    } else {
      fetch("/api/analytics/dashboards", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") flushSave();
    };
    const onBeforeUnload = () => flushSave();
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [flushSave]);

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
        // Следующий месяц от последнего периода или текущей даты
        const lastLabel = prev.periods[prev.periods.length - 1].label;
        const nextDate = parseAndAdvanceMonth(lastLabel, prev.periods.length);
        newPeriod = { label: nextDate };
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

  const updatePeriod = useCallback(
    (periodIdx: number, label: string) => {
      setDashboard((prev) => {
        if (!prev) return prev;
        const next = {
          ...prev,
          periods: prev.periods.map((p, i) => (i === periodIdx ? { label } : p)),
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
    updatePeriod,
    analyze,
    save,
    share,
  };
}
