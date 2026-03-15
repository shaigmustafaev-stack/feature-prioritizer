import type { Period, Metric } from "./types"

interface ParseResult {
  periods: Period[]
  metrics: Metric[]
}

type Row = Record<string, unknown>

/**
 * Определяет, является ли строка «мусорной» (метаданные/фильтры из экспорта).
 * Мусорная строка: больше половины значений пустые или null.
 */
function isMetadataRow(row: Row, headers: string[]): boolean {
  const emptyCount = headers.filter(h => {
    const v = row[h]
    return v === null || v === undefined || v === "" || (typeof v === "string" && v.trim() === "")
  }).length
  return emptyCount > headers.length / 2
}

/**
 * Пытаемся переинтерпретировать данные: находим строку-заголовок среди данных
 * (первая строка где большинство ячеек непустые), используем её как новые ключи,
 * а оставшиеся строки — как данные.
 */
function reinterpretWithHeaderRow(data: Row[]): Row[] | null {
  const origHeaders = Object.keys(data[0])

  // Ищем первую строку с данными (не метадата)
  let headerRowIdx = -1
  for (let i = 0; i < Math.min(data.length, 10); i++) {
    if (!isMetadataRow(data[i], origHeaders)) {
      headerRowIdx = i
      break
    }
  }
  if (headerRowIdx === -1 || headerRowIdx >= data.length - 1) return null

  // Эта строка — новый заголовок
  const newHeaders = origHeaders.map(h => String(data[headerRowIdx][h] ?? "").trim()).map((h, i) => h || `col_${i}`)
  const newData: Row[] = []
  for (let i = headerRowIdx + 1; i < data.length; i++) {
    if (isMetadataRow(data[i], origHeaders)) continue
    const row: Row = {}
    origHeaders.forEach((origH, idx) => {
      const val = data[i][origH]
      // Пробуем привести к числу
      if (typeof val === "string" && val.trim() !== "") {
        const num = Number(val.replace(/\s/g, ""))
        row[newHeaders[idx]] = isNaN(num) ? val : num
      } else {
        row[newHeaders[idx]] = val
      }
    })
    newData.push(row)
  }
  return newData.length > 0 ? newData : null
}

function classifyColumns(data: Row[]): { numericCols: string[]; textCols: string[] } {
  const headers = Object.keys(data[0])
  const numericCols: string[] = []
  const textCols: string[] = []

  for (const header of headers) {
    const values = data.map(row => row[header])
    const allNumbers = values.every(v => typeof v === "number" && !isNaN(v as number))

    if (allNumbers) {
      // Reclassify if ≤ 5 unique values (likely year/category, not metric)
      const uniqueCount = new Set(values.map(String)).size
      if (uniqueCount <= 5 && uniqueCount < data.length) {
        textCols.push(header)
      } else {
        numericCols.push(header)
      }
    } else {
      textCols.push(header)
    }
  }
  return { numericCols, textCols }
}

export function parseCSVToMetrics(data: Row[]): ParseResult | null {
  if (!data.length) return null

  const headers = Object.keys(data[0])
  if (!headers.length) return null

  // Step 1: Classify columns
  let { numericCols, textCols } = classifyColumns(data)

  // Если нет числовых колонок — пробуем переинтерпретировать (CSV с метаданными сверху)
  if (numericCols.length === 0) {
    const reinterpreted = reinterpretWithHeaderRow(data)
    if (!reinterpreted) return null
    data = reinterpreted
    const reclassified = classifyColumns(data)
    numericCols = reclassified.numericCols
    textCols = reclassified.textCols
  }

  if (numericCols.length === 0) return null

  // Step 2: Build row labels
  const labels: string[] = data.map((row, i) => {
    if (textCols.length === 0) return String(i + 1)
    return textCols.map(col => String(row[col] ?? "")).filter(Boolean).join(" · ") || String(i + 1)
  })

  // Step 3: Group by label and aggregate (sum)
  const uniqueLabels: string[] = []
  const labelIndexMap = new Map<string, number>()
  const sums = new Map<string, number[]>()

  for (let i = 0; i < data.length; i++) {
    const label = labels[i]
    if (!labelIndexMap.has(label)) {
      labelIndexMap.set(label, uniqueLabels.length)
      uniqueLabels.push(label)
      sums.set(label, numericCols.map(() => 0))
    }
    const acc = sums.get(label)!
    for (let c = 0; c < numericCols.length; c++) {
      const val = data[i][numericCols[c]]
      acc[c] += typeof val === "number" ? val : 0
    }
  }

  // Step 4: Build result
  const periods: Period[] = uniqueLabels.map(label => ({ label }))

  const metrics: Metric[] = numericCols.map((colName, colIdx) => ({
    id: crypto.randomUUID(),
    name: colName,
    rows: [{
      label: "",
      values: uniqueLabels.map(label => sums.get(label)![colIdx]),
    }],
  }))

  return { periods, metrics }
}
