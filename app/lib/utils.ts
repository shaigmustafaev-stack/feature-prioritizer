import { STATUSES } from "./types";
import type { Feature, FormState, FormErrors, ScoringMode } from "./types";
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
