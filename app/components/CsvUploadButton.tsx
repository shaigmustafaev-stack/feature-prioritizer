"use client"

import { useRef } from "react"
import Papa from "papaparse"
import * as XLSX from "xlsx"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { parseCSVToMetrics } from "../lib/csv-parser"
import type { Metric, Period } from "../lib/types"

interface CsvUploadButtonProps {
  onImport: (metrics: Metric[], periods: Period[]) => void
}

export function CsvUploadButton({ onImport }: CsvUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const processData = (data: Record<string, unknown>[]) => {
    const parsed = parseCSVToMetrics(data)
    if (!parsed) {
      toast.error("Не удалось распознать данные. Нужен хотя бы один числовой столбец.")
      return
    }
    onImport(parsed.metrics, parsed.periods)
    toast.success(`Загружено: ${parsed.metrics.length} метрик, ${parsed.periods.length} периодов`)
  }

  const handleFile = (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase()

    if (ext === "xlsx" || ext === "xls") {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(e.target?.result, { type: "array" })
          const sheet = wb.Sheets[wb.SheetNames[0]]
          const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet)
          if (!data.length) {
            toast.error("Файл пустой или не удалось прочитать данные")
            return
          }
          processData(data)
        } catch {
          toast.error("Ошибка чтения XLSX файла")
        }
      }
      reader.readAsArrayBuffer(file)
      return
    }

    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete(results) {
        if (results.errors.length > 0) {
          toast.error("Ошибка чтения CSV: " + results.errors[0].message)
          return
        }
        processData(results.data as Record<string, unknown>[])
      },
      error(err) {
        toast.error("Ошибка чтения файла: " + err.message)
      },
    })
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    // Reset so the same file can be re-uploaded
    e.target.value = ""
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.tsv,.txt,.xlsx,.xls"
        className="hidden"
        onChange={handleChange}
      />
      <Button
        variant="outline"
        onClick={() => inputRef.current?.click()}
      >
        📄 Загрузить CSV / XLSX
      </Button>
    </>
  )
}
