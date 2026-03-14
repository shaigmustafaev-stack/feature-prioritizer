"use client"

import { KpiCard } from "./KpiCard"
import { ChartBlock } from "./ChartBlock"
import type { Metric, Period, Insight } from "../lib/types"

interface DashboardViewProps {
  metrics: Metric[]
  periods: Period[]
  insights: Insight[]
  analyzing?: boolean
}

export function DashboardView({ metrics, periods, insights, analyzing }: DashboardViewProps) {
  if (!metrics.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg">Нет данных для отображения</p>
        <p className="text-sm mt-1">Добавьте метрики и нажмите «Анализировать»</p>
      </div>
    )
  }

  const kpiData = metrics.map((m) => ({
    name: m.name,
    values: m.rows.length === 1
      ? m.rows[0].values
      : m.rows[0].values.map((_, colIdx) => m.rows.reduce((sum, row) => sum + (row.values[colIdx] ?? 0), 0)),
  }))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {kpiData.map((kpi) => <KpiCard key={kpi.name} name={kpi.name} values={kpi.values} />)}
      </div>
      <div className="space-y-4">
        {metrics.map((metric) => (
          <ChartBlock key={metric.id} metric={metric} periods={periods}
            insight={insights.find((ins) => ins.metricId === metric.id)} analyzing={analyzing} />
        ))}
      </div>
    </div>
  )
}
