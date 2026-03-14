"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import type { Metric, Period } from "../lib/types"

/** Числовая ячейка: позволяет пустое поле при вводе, коммитит число на blur */
function NumericCell({ value, onChange }: { value: number; onChange: (val: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState("")

  return (
    <Input
      type="number"
      value={editing ? draft : value}
      onFocus={(e) => {
        setEditing(true)
        setDraft(e.target.value)
        e.target.select()
      }}
      onChange={(e) => {
        setDraft(e.target.value)
        onChange(e.target.value)
      }}
      onBlur={() => setEditing(false)}
      className="h-7 text-sm text-center"
    />
  )
}

const SEGMENT_PRESETS = [
  { value: "", label: "Без разреза" },
  { value: "по платформам", label: "По платформам" },
  { value: "по тарифам", label: "По тарифам" },
  { value: "по зонам", label: "По зонам" },
]

interface MetricInputProps {
  metric: Metric
  periods: Period[]
  onUpdate: (metric: Metric) => void
  onRemove: () => void
  onRemovePeriod?: (periodIdx: number) => void
  onUpdatePeriod?: (periodIdx: number, label: string) => void
}

function formatPeriodLabel(p: Period): string {
  return p.label
}

export function MetricInput({ metric, periods, onUpdate, onRemove, onRemovePeriod, onUpdatePeriod }: MetricInputProps) {
  const updateName = (name: string) => onUpdate({ ...metric, name })

  const updateSegmentTag = (tag: string | null) => {
    if (tag === null) return
    // Предупреждение при сбросе сегментации — данные сегментов будут потеряны
    if (!tag && metric.rows.length > 1) {
      const confirmed = window.confirm(
        `Сбросить разрез? Данные ${metric.rows.length - 1} сегментов будут удалены.`
      )
      if (!confirmed) return
      toast.info("Сегменты сброшены, оставлена первая строка")
    }
    const newMetric = { ...metric, segmentTag: tag || undefined }
    if (!tag && metric.rows.length > 1) {
      newMetric.rows = [{ label: "", values: metric.rows[0]?.values || periods.map(() => 0) }]
    }
    onUpdate(newMetric)
  }

  const updateValue = (rowIdx: number, colIdx: number, val: string) => {
    const rows = metric.rows.map((row, ri) => {
      if (ri !== rowIdx) return row
      const values = [...row.values]
      values[colIdx] = val === "" || val === "-" ? 0 : Number(val)
      return { ...row, values }
    })
    onUpdate({ ...metric, rows })
  }

  const updateRowLabel = (rowIdx: number, label: string) => {
    const rows = metric.rows.map((row, ri) => ri === rowIdx ? { ...row, label } : row)
    onUpdate({ ...metric, rows })
  }

  const addSegment = () => {
    onUpdate({ ...metric, rows: [...metric.rows, { label: "", values: periods.map(() => 0) }] })
  }

  const removeSegment = (rowIdx: number) => {
    if (metric.rows.length <= 1) return
    onUpdate({ ...metric, rows: metric.rows.filter((_, i) => i !== rowIdx) })
  }

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      {/* Header row: name input, segment select, delete button */}
      <div className="flex items-center gap-2 flex-wrap">
        <Input
          value={metric.name}
          onChange={(e) => updateName(e.target.value)}
          placeholder="Название метрики"
          className="flex-1 min-w-[160px]"
        />
        <Select value={metric.segmentTag ?? ""} onValueChange={updateSegmentTag}>
          <SelectTrigger className="w-[160px]" aria-label="Разрез метрики">
            <SelectValue placeholder="Без разреза" />
          </SelectTrigger>
          <SelectContent>
            {SEGMENT_PRESETS.map((preset) => (
              <SelectItem key={preset.value} value={preset.value}>
                {preset.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="destructive" size="icon" onClick={onRemove} aria-label="Удалить метрику">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2" />
          </svg>
        </Button>
      </div>

      {/* Values table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              {metric.segmentTag && <th className="text-left pr-2 py-1 text-muted-foreground font-medium min-w-[100px]">Сегмент</th>}
              {periods.map((p, i) => (
                <th key={i} className="text-center px-1 py-1 text-muted-foreground font-medium min-w-[72px]">
                  <span className="inline-flex items-center gap-0.5">
                    {onUpdatePeriod ? (
                      <input
                        type="text"
                        value={formatPeriodLabel(p)}
                        onChange={(e) => onUpdatePeriod(i, e.target.value)}
                        className="w-full bg-transparent text-center text-sm font-medium text-muted-foreground outline-none focus:text-foreground focus:ring-1 focus:ring-ring rounded px-1"
                        aria-label={`Название периода ${i + 1}`}
                      />
                    ) : (
                      formatPeriodLabel(p)
                    )}
                    {onRemovePeriod && periods.length > 1 && (
                      <button
                        type="button"
                        onClick={() => onRemovePeriod(i)}
                        className="ml-0.5 text-muted-foreground/50 hover:text-destructive transition-colors shrink-0"
                        aria-label={`Удалить период ${formatPeriodLabel(p)}`}
                      >
                        ×
                      </button>
                    )}
                  </span>
                </th>
              ))}
              {metric.segmentTag && metric.rows.length > 1 && <th className="w-8" />}
            </tr>
          </thead>
          <tbody>
            {metric.rows.map((row, ri) => (
              <tr key={ri}>
                {metric.segmentTag && (
                  <td className="pr-2 py-1">
                    <Input
                      value={row.label}
                      onChange={(e) => updateRowLabel(ri, e.target.value)}
                      placeholder={`Сегмент ${ri + 1}`}
                      className="h-7 text-sm"
                    />
                  </td>
                )}
                {periods.map((_, ci) => (
                  <td key={ci} className="px-1 py-1">
                    <NumericCell
                      value={row.values[ci] ?? 0}
                      onChange={(val) => updateValue(ri, ci, val)}
                    />
                  </td>
                ))}
                {metric.segmentTag && metric.rows.length > 1 && (
                  <td className="pl-1 py-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeSegment(ri)}
                      aria-label="Удалить сегмент"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-3.5">
                        <path d="M18 6 6 18M6 6l12 12" />
                      </svg>
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add segment button */}
      {metric.segmentTag && (
        <Button variant="outline" size="sm" onClick={addSegment} className="w-full">
          + Добавить сегмент
        </Button>
      )}
    </div>
  )
}
