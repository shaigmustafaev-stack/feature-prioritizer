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
