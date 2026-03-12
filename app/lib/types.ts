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
  month: number
  year: number
}

export type ChartType = "line" | "bar" | "pie" | "horizontal-bar"

export interface Insight {
  metricId: string
  text: string
}

export interface Dashboard {
  id: string
  name: string
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
  data: { periods: Period[]; metrics: Metric[]; insights: Insight[] }
  share_id: string | null
  user_id: string
  created_at: string
}
