"use client"

import { calcDelta, formatMetricValue } from "../lib/utils"

interface KpiCardProps {
  name: string
  values: number[]
}

export function KpiCard({ name, values }: KpiCardProps) {
  const current = values[values.length - 1] ?? 0
  const delta = calcDelta(values)

  return (
    <div className="rounded-xl border bg-card p-4 space-y-1">
      <p className="text-sm text-muted-foreground truncate">{name}</p>
      <p className="text-2xl font-bold">{formatMetricValue(current)}</p>
      {delta.value !== 0 && (
        <p className={`text-sm font-medium ${delta.value > 0 ? "text-green-600" : "text-red-500"}`}>
          {delta.value > 0 ? "▲" : "▼"} {Math.abs(delta.percent).toFixed(1)}%
        </p>
      )}
    </div>
  )
}
