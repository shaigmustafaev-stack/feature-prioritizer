"use client"

import {
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from "recharts"
import type { Metric, Period, Insight } from "../lib/types"
import { pickChartType, formatMetricValue } from "../lib/utils"

const COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"]

interface ChartBlockProps {
  metric: Metric
  periods: Period[]
  insight?: Insight
  analyzing?: boolean
}

function formatPeriodLabel(p: Period): string {
  const date = new Date(p.year, p.month)
  return date.toLocaleDateString("ru-RU", { month: "short", year: "2-digit" })
}

export function ChartBlock({ metric, periods, insight, analyzing }: ChartBlockProps) {
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
      <h3 className="font-semibold text-base">
        {metric.name}
        {metric.segmentTag && (
          <span className="ml-2 text-sm text-muted-foreground font-normal">{metric.segmentTag}</span>
        )}
      </h3>

      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === "line" ? (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="period" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={formatMetricValue} domain={["auto", "auto"]} />
              <Tooltip formatter={(v: unknown) => formatMetricValue(v as number)} />
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
              <Tooltip formatter={(v: unknown) => formatMetricValue(v as number)} />
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
              <Tooltip formatter={(v: unknown) => formatMetricValue(v as number)} />
              {rowKeys.length > 1 && <Legend />}
              {rowKeys.map((key, i) => (
                <Bar key={key} dataKey={key} fill={COLORS[i % COLORS.length]} />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      <div className="pt-2 border-t">
        {analyzing ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            Анализирую...
          </div>
        ) : insight?.summary ? (
          <div className="space-y-3">
            <p className="text-sm font-semibold bg-muted p-3 rounded-lg">{insight.summary}</p>
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
          </div>
        ) : insight?.text ? (
          <p className="text-sm text-muted-foreground leading-relaxed">{insight.text}</p>
        ) : (
          <p className="text-sm text-muted-foreground italic">Нажмите «Анализировать» для получения AI-выводов</p>
        )}
      </div>
    </div>
  )
}
