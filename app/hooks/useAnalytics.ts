"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { toast } from "sonner";
import type { Dashboard, DashboardRow, Metric, Period, Insight } from "../lib/types";
import { migratePeriod } from "../lib/utils";

// Минимальный тип пользователя — не импортируем весь @supabase/supabase-js
type AuthUser = { id: string; email?: string | null };

/** Lightweight string hash for AI cache keys (djb2) */
function hashString(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return hash.toString(36);
}

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
    description: row.data?.description ?? "",
    notes: row.data?.notes ?? {},
    folder: row.data?.folder ?? "",
    periods: (row.data?.periods ?? []).map(migratePeriod),
    metrics: row.data?.metrics ?? [],
    insights: row.data?.insights ?? [],
    created_at: row.created_at,
    user_id: row.user_id,
    share_id: row.share_id ?? undefined,
  };
}

function buildSavePayload(d: Dashboard) {
  return {
    id: d.id,
    name: d.name,
    data: {
      periods: d.periods,
      metrics: d.metrics,
      insights: d.insights,
      description: d.description,
      notes: d.notes,
      folder: d.folder,
    },
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

  // AI response cache (lives until page reload)
  const aiCacheRef = useRef<Map<string, { insights: Insight[]; dashboardSummary?: string }>>(new Map());

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
        const res = await fetch("/api/analytics/dashboards", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildSavePayload(current)),
        });
        if (!res.ok) throw new Error("PUT failed");
        toast.success("Сохранено", { id: "auto-save", duration: 1500 });
      } catch {
        toast.error("Ошибка сохранения", { id: "auto-save" });
      }
    }, 5000);
  }, [user]);

  // ── Немедленное сохранение (flush) при уходе со страницы ─────────────────
  const flushSave = useCallback(() => {
    const current = dashboardRef.current;
    if (!current || !user) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    // sendBeacon для надёжной отправки при закрытии вкладки
    const payload = JSON.stringify(buildSavePayload(current));
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

    // Check AI cache
    const cacheKey = hashString(JSON.stringify({ m: dashboard.metrics, p: dashboard.periods }));
    const cached = aiCacheRef.current.get(cacheKey);
    if (cached) {
      const summaryInsight: Insight | undefined = cached.dashboardSummary
        ? { metricId: "__summary__", summary: cached.dashboardSummary }
        : undefined;
      const allInsights = summaryInsight
        ? [summaryInsight, ...cached.insights]
        : cached.insights;
      setDashboard((prev) => {
        if (!prev) return prev;
        const next = { ...prev, insights: allInsights };
        dashboardRef.current = next;
        return next;
      });
      setActiveTab("dashboard");
      return;
    }

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
      const { insights, dashboardSummary: summary } = await res.json();

      // Cache the response
      aiCacheRef.current.set(cacheKey, { insights, dashboardSummary: summary });

      // Add summary as a special insight
      const summaryInsight: Insight | undefined = summary
        ? { metricId: "__summary__", summary }
        : undefined;
      const allInsights = summaryInsight ? [summaryInsight, ...insights] : insights;

      // Обновляем состояние и принудительно сохраняем
      setDashboard((prev) => {
        if (!prev) return prev;
        const next = { ...prev, insights: allInsights };
        dashboardRef.current = next;
        return next;
      });

      // Принудительное немедленное сохранение
      const current = dashboardRef.current;
      if (current) {
        await fetch("/api/analytics/dashboards", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildSavePayload({ ...current, insights: allInsights })),
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
        body: JSON.stringify(buildSavePayload(current)),
      });
      if (!res.ok) throw new Error("Не удалось сохранить дашборд");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка сохранения");
    }
  }, [user]);

  // ── Заметки к метрикам ───────────────────────────────────────────────────
  const updateNote = useCallback(
    (metricId: string, text: string) => {
      setDashboard((prev) => {
        if (!prev) return prev;
        const notes = { ...(prev.notes ?? {}), [metricId]: text };
        const next = { ...prev, notes };
        dashboardRef.current = next;
        return next;
      });
      triggerAutoSave();
    },
    [triggerAutoSave]
  );

  // ── Редактирование инсайтов ─────────────────────────────────────────────
  const updateInsight = useCallback(
    (metricId: string, updates: Partial<Insight>) => {
      setDashboard((prev) => {
        if (!prev) return prev;
        const insights = prev.insights.map((ins) =>
          ins.metricId === metricId ? { ...ins, ...updates } : ins
        );
        const next = { ...prev, insights };
        dashboardRef.current = next;
        return next;
      });
      triggerAutoSave();
    },
    [triggerAutoSave]
  );

  // ── Перестановка метрик ─────────────────────────────────────────────────
  const reorderMetrics = useCallback(
    (ids: string[]) => {
      setDashboard((prev) => {
        if (!prev) return prev;
        const byId = new Map(prev.metrics.map((m) => [m.id, m]));
        const metrics = ids.map((id) => byId.get(id)).filter(Boolean) as Metric[];
        const next = { ...prev, metrics };
        dashboardRef.current = next;
        return next;
      });
      triggerAutoSave();
    },
    [triggerAutoSave]
  );

  // ── Шаблоны периодов ───────────────────────────────────────────────────
  const addPeriodsFromTemplate = useCallback(
    (template: "quarters" | "months-6" | "months-12") => {
      setDashboard((prev) => {
        if (!prev) return prev;
        const now = new Date();
        const year = now.getFullYear();
        let labels: string[];
        if (template === "quarters") {
          labels = [`Q1 ${year}`, `Q2 ${year}`, `Q3 ${year}`, `Q4 ${year}`];
        } else {
          const count = template === "months-6" ? 6 : 12;
          labels = [];
          for (let i = 0; i < count; i++) {
            const d = new Date(year, now.getMonth() + i, 1);
            const dd = String(d.getDate()).padStart(2, "0");
            const mm = String(d.getMonth() + 1).padStart(2, "0");
            const yy = String(d.getFullYear()).slice(-2);
            labels.push(`${dd}.${mm}.${yy}`);
          }
        }
        const newPeriods = labels.map((label) => ({ label }));
        const updatedMetrics = prev.metrics.map((m) => ({
          ...m,
          rows: m.rows.map((row) => ({
            ...row,
            values: [...row.values, ...newPeriods.map(() => 0)],
          })),
        }));
        const next = {
          ...prev,
          periods: [...prev.periods, ...newPeriods],
          metrics: updatedMetrics,
        };
        dashboardRef.current = next;
        return next;
      });
      triggerAutoSave();
    },
    [triggerAutoSave]
  );

  // ── Отозвать ссылку ─────────────────────────────────────────────────────
  const revokeShare = useCallback(async (): Promise<"needs-auth" | void> => {
    if (!user) return "needs-auth";
    const current = dashboardRef.current;
    if (!current) return;
    try {
      const res = await fetch("/api/analytics/share", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: current.id }),
      });
      if (!res.ok) throw new Error("Не удалось отозвать ссылку");
      setDashboard((prev) => {
        if (!prev) return prev;
        const next = { ...prev, share_id: undefined };
        dashboardRef.current = next;
        return next;
      });
      toast.success("Ссылка отозвана");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка отзыва ссылки");
    }
  }, [user]);

  // ── Dashboard summary (memo для UI) ────────────────────────────────────
  const dashboardSummary = useMemo(() => ({
    metricsCount: dashboard?.metrics.length ?? 0,
    periodsCount: dashboard?.periods.length ?? 0,
    totalDataPoints: dashboard?.metrics.reduce(
      (s, m) => s + m.rows.reduce((s2, r) => s2 + r.values.length, 0), 0
    ) ?? 0,
  }), [dashboard?.metrics, dashboard?.periods]);

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
    dashboardSummary,
    updateDashboard,
    addMetric,
    removeMetric,
    updateMetric,
    addPeriod,
    removePeriod,
    updatePeriod,
    updateNote,
    updateInsight,
    reorderMetrics,
    addPeriodsFromTemplate,
    revokeShare,
    analyze,
    save,
    share,
  };
}
