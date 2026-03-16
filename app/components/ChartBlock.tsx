"use client"

import {
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from "recharts"
import { useState } from "react"
import type { Metric, Period, Insight } from "../lib/types"
import { pickChartType, formatMetricValue, formatExactValue } from "../lib/utils"

const COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"]

interface InsightBlockProps {
  insight?: Insight
  analyzing?: boolean
  onEdit?: (field: string, value: string) => void
}

function InsightBlock({ insight, analyzing, onEdit }: InsightBlockProps) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState("")

  if (analyzing) {
    return (
      <div className="pt-2 border-t">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Анализирую...
        </div>
      </div>
    )
  }

  if (!insight?.summary) {
    return (
      <div className="pt-2 border-t">
        {insight?.text ? (
          <p className="text-sm text-muted-foreground leading-relaxed">{insight.text}</p>
        ) : (
          <p className="text-sm text-muted-foreground italic">Нажмите «Анализировать» для получения AI-выводов</p>
        )}
      </div>
    )
  }

  const hasDetails = insight.detail || (insight.hypotheses && insight.hypotheses.length > 0) || insight.action

  const handleStartEdit = () => {
    setEditText(insight.summary ?? "")
    setEditing(true)
  }

  const handleFinishEdit = () => {
    setEditing(false)
    if (editText !== insight.summary && onEdit) {
      onEdit("summary", editText)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleFinishEdit()
    }
  }

  return (
    <div className="pt-2 border-t">
      <div className="space-y-3">
        {editing ? (
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={handleFinishEdit}
            onKeyDown={handleKeyDown}
            autoFocus
            className="w-full text-sm font-semibold bg-muted p-3 rounded-lg border border-primary/30 outline-none resize-none"
            rows={2}
          />
        ) : (
          <div className="flex items-start gap-1">
            <button
              type="button"
              onClick={() => hasDetails && setExpanded(!expanded)}
              className={`flex-1 text-left text-sm font-semibold bg-muted p-3 rounded-lg flex items-center justify-between gap-2 ${hasDetails ? "cursor-pointer hover:bg-muted/80 transition-colors" : "cursor-default"}`}
            >
              <span>{insight.summary}</span>
              {hasDetails && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`size-4 shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              )}
            </button>
            {onEdit && (
              <button
                type="button"
                onClick={handleStartEdit}
                className="shrink-0 p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                aria-label="Редактировать вывод"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-4"
                >
                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                  <path d="m15 5 4 4" />
                </svg>
              </button>
            )}
          </div>
        )}

        {expanded && (
          <>
            {insight.detail && (
              <p className="text-sm text-muted-foreground leading-relaxed">{insight.detail}</p>
            )}
            {insight.hypotheses && insight.hypotheses.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">◆ Гипотезы</p>
                {insight.hypotheses.map((h, i) => (
                  <div key={i} className="text-sm border-l-3 border-amber-500 p-3 bg-amber-500/10 rounded-r-lg">
                    {h}
                  </div>
                ))}
              </div>
            )}
            {insight.action && (
              <div>
                <p className="text-xs uppercase tracking-wide font-semibold text-muted-foreground mb-1.5">→ Проверить</p>
                <div className="text-sm border-l-3 border-emerald-500 p-3 bg-emerald-500/10 rounded-r-lg font-medium">
                  {insight.action}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

interface ChartBlockProps {
  metric: Metric
  periods: Period[]
  insight?: Insight
  analyzing?: boolean
  onInsightEdit?: (metricId: string, field: string, value: string) => void
  note?: string
  onNoteChange?: (metricId: string, text: string) => void
}

function formatPeriodLabel(p: Period): string {
  return p.label
}

export function ChartBlock({ metric, periods, insight, analyzing, onInsightEdit, note, onNoteChange }: ChartBlockProps) {
  const [insightHidden, setInsightHidden] = useState(false)
  const chartType = pickChartType(metric, periods.length)
  const periodLabels = periods.map(formatPeriodLabel)

  // Дедупликация ключей: если несколько строк без label, добавляем индекс
  const rowKeys = metric.rows.map((r, i) => {
    const base = r.label || metric.name
    const duplicateBefore = metric.rows.slice(0, i).filter((prev) => (prev.label || metric.name) === base).length
    return duplicateBefore > 0 ? `${base} (${duplicateBefore + 1})` : base
  })

  const data = periodLabels.map((label, i) => {
    const point: Record<string, string | number> = { period: label }
    metric.rows.forEach((row, ri) => {
      point[rowKeys[ri]] = row.values[i] ?? 0
    })
    return point
  })

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold text-base">
          {metric.name}
          {metric.segmentTag && (
            <span className="ml-2 text-sm text-muted-foreground font-normal">— {metric.segmentTag}</span>
          )}
        </h3>
        <button
          type="button"
          onClick={() => setInsightHidden(!insightHidden)}
          className="shrink-0 p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          aria-label={insightHidden ? "Показать выводы" : "Скрыть выводы"}
        >
          {insightHidden ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-4"
            >
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-4"
            >
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>

      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === "line" ? (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="period" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={formatMetricValue} domain={["auto", "auto"]} />
              <Tooltip formatter={(v: unknown) => formatExactValue(v as number)} />
              {rowKeys.length > 1 && <Legend />}
              {rowKeys.map((key, i) => (
                <Line key={key} type="monotone" dataKey={key} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
              ))}
            </LineChart>
          ) : chartType === "pie" ? (
            <PieChart>
              <Pie
                data={metric.rows.map((r) => ({ name: r.label || metric.name, value: r.values[0] ?? 0 }))}
                cx="50%" cy="50%" outerRadius={100} dataKey="value"
                label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ""}: ${((percent ?? 0) * 100).toFixed(0)}%`}
              >
                {metric.rows.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: unknown) => formatExactValue(v as number)} />
            </PieChart>
          ) : (
            <BarChart data={data} layout={chartType === "horizontal-bar" ? "vertical" : "horizontal"}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              {chartType === "horizontal-bar" ? (
                <>
                  <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={formatMetricValue} />
                  <YAxis type="category" dataKey="period" tick={{ fontSize: 12 }} width={80} />
                </>
              ) : (
                <>
                  <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={formatMetricValue} domain={["auto", "auto"]} />
                </>
              )}
              <Tooltip formatter={(v: unknown) => formatExactValue(v as number)} />
              {rowKeys.length > 1 && <Legend />}
              {rowKeys.map((key, i) => (
                <Bar key={key} dataKey={key} fill={COLORS[i % COLORS.length]} />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      <textarea
        value={note ?? ""}
        onChange={(e) => onNoteChange?.(metric.id, e.target.value)}
        placeholder="Заметка к графику..."
        className="w-full text-sm border rounded-lg p-2 bg-transparent resize-none outline-none focus:border-primary/50 transition-colors placeholder:text-muted-foreground/50"
        rows={2}
      />

      {!insightHidden && (
        <InsightBlock
          insight={insight}
          analyzing={analyzing}
          onEdit={onInsightEdit ? (field, value) => onInsightEdit(metric.id, field, value) : undefined}
        />
      )}
    </div>
  )
}
