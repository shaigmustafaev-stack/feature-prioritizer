import { STATUSES } from "./types";
import type { Feature, FormState, FormErrors, ScoringMode, Metric, ChartType, Period } from "./types";
import { IMPACT_SCALE, CONF_OPTIONS } from "./constants";

export const calcRice = (f: Feature): number =>
  f.effort > 0 ? Math.round((f.reach * f.impact * (f.confidence / 100)) / f.effort) : 0;

export const calcIce = (f: Feature): number =>
  f.effort > 0 ? Math.round((f.impact * (f.confidence / 100) * (10 / f.effort)) * 100) / 100 : 0;

export const getScore = (f: Feature, mode: ScoringMode): number =>
  mode === "RICE" ? calcRice(f) : calcIce(f);

export const getBarColor = (score: number, maxScore: number): string => {
  const ratio = maxScore > 0 ? score / maxScore : 0;
  if (ratio > 0.66) return "#22c55e";
  if (ratio > 0.33) return "#eab308";
  return "#ef4444";
};

export const validateFeature = (data: FormState, mode: ScoringMode): { valid: boolean; errors: FormErrors } => {
  const errors: FormErrors = {};
  if (!data.name.trim()) errors.name = "Введи название фичи";
  if (mode === "RICE" && (!data.reach || Number(data.reach) <= 0)) errors.reach = "Укажи число больше 0";
  if (!data.effort || Number(data.effort) <= 0) errors.effort = "Укажи число больше 0";
  return { valid: Object.keys(errors).length === 0, errors };
};

export const getImpactLabel = (val: string): string =>
  IMPACT_SCALE.find(o => String(o.val) === val)?.label ?? val;

export const getConfLabel = (val: string): string =>
  CONF_OPTIONS.find(o => String(o.val) === val)?.label ?? val;

export const formatScore = (score: number): string => {
  if (score >= 10000) return `${Math.round(score / 1000)}K`;
  if (score >= 1000) return `${(score / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(score);
};

export const buildCsv = (features: Feature[]): string => {
  const header = ["#", "Название", "Описание", "Статус", "Охват", "Влияние", "Уверенность %", "Трудозатраты (мес)", "RICE", "ICE"];
  const rows = features.map((f, i) => [
    i + 1,
    `"${f.name.replace(/"/g, '""')}"`,
    `"${(f.desc || "").replace(/"/g, '""')}"`,
    STATUSES[f.status].label,
    f.reach,
    f.impact,
    f.confidence,
    f.effort,
    calcRice(f),
    calcIce(f),
  ]);
  return "\uFEFF" + [header.join(","), ...rows.map(r => r.join(","))].join("\n");
};

export const pickChartType = (metric: Metric, periodsCount: number): ChartType => {
  const segmentCount = metric.rows.length

  if (periodsCount === 1) {
    if (segmentCount >= 6) return "horizontal-bar"
    if (segmentCount >= 2) return "pie"
    return "bar"
  }

  if (segmentCount <= 1 && periodsCount >= 3) return "line"
  if (segmentCount >= 6) return "line"
  if (segmentCount >= 2) return "bar"

  return "bar"
}

export const calcDelta = (values: number[]): { value: number; percent: number } => {
  if (values.length < 2) return { value: 0, percent: 0 }
  const prev = values[values.length - 2]
  const curr = values[values.length - 1]
  const value = curr - prev
  const percent = prev !== 0 ? (value / prev) * 100 : 0
  return { value, percent }
}

export const formatMetricValue = (value: number): string => {
  if (value >= 1_000_000) {
    const m = value / 1_000_000
    return m % 1 === 0 ? `${m}M` : `${parseFloat(m.toFixed(1))}M`
  }
  if (value >= 1_000) {
    const k = value / 1_000
    return k % 1 === 0 ? `${k}K` : `${parseFloat(k.toFixed(1))}K`
  }
  return String(value)
}

export const formatExactValue = (value: number): string => {
  return new Intl.NumberFormat('ru-RU', { useGrouping: true }).format(value)
}

export function migratePeriod(p: { month?: number; year?: number; label?: string }): Period {
  if (p.label) return { label: p.label }
  const d = new Date(p.year!, p.month!)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yy = String(d.getFullYear()).slice(-2)
  return { label: `${dd}.${mm}.${yy}` }
}
