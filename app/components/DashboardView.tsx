"use client"

import { KpiCard } from "./KpiCard"
import { ChartBlock } from "./ChartBlock"
import type { Metric, Period, Insight } from "../lib/types"

interface DashboardViewProps {
  metrics: Metric[]
  periods: Period[]
  insights: Insight[]
  analyzing?: boolean
  notes?: Record<string, string>
  onNoteChange?: (metricId: string, text: string) => void
  onInsightEdit?: (metricId: string, field: string, value: string) => void
  loading?: boolean
  summary?: string
}

export function DashboardView({ metrics, periods, insights, analyzing, notes, onNoteChange, onInsightEdit, loading, summary }: DashboardViewProps) {
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
        <div className="space-y-4">
          {[1,2].map(i => (
            <div key={i} className="h-[340px] animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    )
  }

  // Фильтруем пустые метрики: без имени или со всеми нулями
  const visibleMetrics = metrics.filter((m) => {
    if (!m.name.trim()) return false
    const allZero = m.rows.every((row) => row.values.every((v) => v === 0))
    return !allZero
  })

  if (!visibleMetrics.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg">Нет данных для отображения</p>
        <p className="text-sm mt-1">Добавьте метрики и нажмите «Анализировать»</p>
      </div>
    )
  }

  const kpiData = visibleMetrics.map((m) => ({
    name: m.name,
    values: m.rows.length === 1
      ? m.rows[0].values
      : m.rows[0].values.map((_, colIdx) => m.rows.reduce((sum, row) => sum + (row.values[colIdx] ?? 0), 0)),
  }))

  // Extract __summary__ insight if present
  const summaryInsight = insights.find((ins) => ins.metricId === "__summary__")
  const displaySummary = summary || summaryInsight?.summary

  return (
    <div className="space-y-6">
      {displaySummary && (
        <div className="rounded-xl border bg-card p-4">
          <h3 className="font-semibold text-sm text-muted-foreground mb-2">Общий вывод</h3>
          <p className="text-sm leading-relaxed">{displaySummary}</p>
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {kpiData.map((kpi) => <KpiCard key={kpi.name} name={kpi.name} values={kpi.values} />)}
      </div>
      <div className="space-y-4">
        {visibleMetrics.map((metric) => (
          <ChartBlock key={metric.id} metric={metric} periods={periods}
            insight={insights.find((ins) => ins.metricId === metric.id && ins.metricId !== "__summary__")} analyzing={analyzing}
            note={notes?.[metric.id]} onNoteChange={onNoteChange} onInsightEdit={onInsightEdit} />
        ))}
      </div>
    </div>
  )
}
