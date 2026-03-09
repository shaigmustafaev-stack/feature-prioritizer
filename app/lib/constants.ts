import type { Feature, FormState, Status } from "./types";

export const DEFAULT_REACH = 100;
export const STATUS_CYCLE: Status[] = ["new", "in-progress", "done", "deferred"];

export const IMPACT_SCALE = [
  { val: 0.25, label: "0.25 — Минимальное" },
  { val: 0.5,  label: "0.5 — Низкое" },
  { val: 1,    label: "1 — Среднее" },
  { val: 2,    label: "2 — Высокое" },
  { val: 3,    label: "3 — Огромное" },
] as const;

export const CONF_OPTIONS = [
  { val: 100, label: "100% — Точные данные" },
  { val: 80,  label: "80% — Уверен" },
  { val: 50,  label: "50% — Гипотеза" },
  { val: 30,  label: "30% — Догадка" },
  { val: 10,  label: "10% — Интуиция" },
] as const;

export const DEMO_FEATURES: Feature[] = [
  { id: 1, name: "Онбординг новых пользователей", desc: "Пошаговый гайд для новичков",    reach: 1000, impact: 3,   confidence: 80, effort: 2,   status: "in-progress" },
  { id: 2, name: "Тёмная тема",                  desc: "Переключение светлая/тёмная",     reach: 500,  impact: 0.5, confidence: 90, effort: 0.5, status: "new" },
  { id: 3, name: "Интеграция с Slack",            desc: "Уведомления и команды в Slack",   reach: 300,  impact: 2,   confidence: 50, effort: 5,   status: "deferred" },
];

export const EMPTY_FORM: FormState = {
  name: "", desc: "", reach: "1000", impact: "1", confidence: "80", effort: "2",
};
