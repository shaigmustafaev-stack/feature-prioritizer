import type { Period, Metric } from "./types"

interface ParseResult {
  periods: Period[]
  metrics: Metric[]
}

type Row = Record<string, unknown>

export function parseCSVToMetrics(data: Row[]): ParseResult | null {
  if (!data.length) return null

  const headers = Object.keys(data[0])
  if (!headers.length) return null

  // Step 1: Classify columns
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
