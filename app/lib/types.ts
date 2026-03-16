export const STATUSES = {
  new:           { label: "Новая",    color: "#64748b", bg: "#64748b18" },
  "in-progress": { label: "В работе", color: "#6366f1", bg: "#6366f118" },
  done:          { label: "Готово",   color: "#22c55e", bg: "#22c55e18" },
  deferred:      { label: "Отложена", color: "#eab308", bg: "#eab30818" },
} as const;

export type Status = keyof typeof STATUSES;
export type ScoringMode = "RICE" | "ICE";

export interface Feature {
  id: number;
  name: string;
  desc: string;
  reach: number;
  impact: number;
  confidence: number;
  effort: number;
  status: Status;
}

export interface FormState {
  name: string;
  desc: string;
  reach: string;
  impact: string;
  confidence: string;
  effort: string;
}

export type FormErrors = Partial<Record<"name" | "reach" | "effort", string>>;

// --- Analytics ---

export interface MetricRow {
  label: string
  values: number[]
}

export interface Metric {
  id: string
  name: string
  segmentTag?: string
  rows: MetricRow[]
}

export interface Period {
  label: string
}

export type ChartType = "line" | "bar" | "pie" | "horizontal-bar"

export interface Insight {
  metricId: string
  // Новые структурированные поля (optional для backward compat со старыми данными)
  chartType?: "line" | "bar" | "pie"  // от AI, НЕ используется для рендера графиков
  summary?: string       // 1 строка: главный факт с дельтой
  detail?: string        // 3-5 предложений подробного анализа
  hypotheses?: string[]  // 2-3 гипотезы от данных
  action?: string        // что PM проверить первым делом
  text?: string          // legacy fallback для старых дашбордов
}

export interface Dashboard {
  id: string
  name: string
  description?: string
  notes?: Record<string, string>
  folder?: string
  periods: Period[]
  metrics: Metric[]
  insights: Insight[]
  created_at: string
  user_id: string
  share_id?: string
}

/** Raw row from Supabase — data is JSONB, not expanded */
export interface DashboardRow {
  id: string
  name: string
  data: { periods: Period[]; metrics: Metric[]; insights: Insight[]; description?: string; notes?: Record<string, string>; folder?: string }
  share_id: string | null
  user_id: string
  created_at: string
}
