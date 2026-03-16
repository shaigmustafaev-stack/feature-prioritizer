# CSV Upload Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users upload a CSV file and instantly see the data in the dashboard — auto-detected, no configuration.

**Architecture:** Three layers: (1) Period type migration `{ month, year }` → `{ label }` with backward compat, (2) CSV parser — pure function that auto-detects columns and converts to `{ periods, metrics }`, (3) UI — upload button + file handling. papaparse handles CSV parsing with auto-detect delimiter/types/BOM.

**Tech Stack:** papaparse, Next.js 16, React 19, TypeScript 5, shadcn/ui, sonner (toasts)

---

## Task 1: Install papaparse

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install papaparse and types**

```bash
npm install papaparse && npm install -D @types/papaparse
```

- [ ] **Step 2: Verify install**

```bash
npx tsc --noEmit
```
Expected: clean

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: добавить papaparse для CSV импорта"
```

---

## Task 2: Migrate Period type to `{ label: string }`

**Files:**
- Modify: `app/lib/types.ts:47-50`
- Modify: `app/lib/utils.ts` (add `migratePeriod`)
- Modify: `app/components/MetricInput.tsx:23-26`
- Modify: `app/components/ChartBlock.tsx:22-25`
- Modify: `app/hooks/useAnalytics.ts:15-18,48-74,164-198`
- Modify: `app/api/analytics/generate/route.ts:40-44`
- Modify: `app/share/[shareId]/page.tsx:55-58`
- Test: `app/__tests__/analytics-utils.test.ts`

- [ ] **Step 1: Write tests for migratePeriod**

Add to `app/__tests__/analytics-utils.test.ts`:

```typescript
import { migratePeriod } from "../lib/utils"

describe("migratePeriod", () => {
  it("passes through new format unchanged", () => {
    expect(migratePeriod({ label: "Q1 2025" })).toEqual({ label: "Q1 2025" })
  })

  it("converts old format { month: 0, year: 2025 } to label", () => {
    const result = migratePeriod({ month: 0, year: 2025 })
    expect(result.label).toBeTruthy()
    expect(typeof result.label).toBe("string")
  })

  it("converts month 11 year 2024", () => {
    const result = migratePeriod({ month: 11, year: 2024 })
    expect(result.label).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test — should fail**

```bash
npx vitest run app/__tests__/analytics-utils.test.ts
```
Expected: FAIL — `migratePeriod` not found

- [ ] **Step 3: Change Period type**

In `app/lib/types.ts`, replace:
```typescript
export interface Period {
  month: number
  year: number
}
```
With:
```typescript
export interface Period {
  label: string
}
```

- [ ] **Step 4: Add migratePeriod to utils**

In `app/lib/utils.ts`, add at the end:

```typescript
export function migratePeriod(p: { month?: number; year?: number; label?: string }): Period {
  if (p.label) return { label: p.label }
  return {
    label: new Date(p.year!, p.month!).toLocaleDateString("ru-RU", { month: "short", year: "2-digit" })
  }
}
```

Add `Period` to the import from `./types`:
```typescript
import type { Feature, FormState, FormErrors, ScoringMode, Metric, ChartType, Period } from "./types";
```

- [ ] **Step 5: Update MetricInput.tsx**

Replace `formatPeriodLabel` function (line 23-26):
```typescript
function formatPeriodLabel(p: Period): string {
  return p.label
}
```

- [ ] **Step 6: Update ChartBlock.tsx**

Replace `formatPeriodLabel` function (line 22-25):
```typescript
function formatPeriodLabel(p: Period): string {
  return p.label
}
```

- [ ] **Step 7: Update useAnalytics.ts — migration in normalizeDashboardRow**

Add import at top:
```typescript
import { migratePeriod } from "../lib/utils";
```

In `normalizeDashboardRow` (line 20-31), change periods line:
```typescript
periods: (row.data?.periods ?? []).map(migratePeriod),
```

- [ ] **Step 8: Update useAnalytics.ts — addPeriod with label**

Replace `createDefaultPeriod` function (line 15-18):
```typescript
function createDefaultPeriod(): Period {
  const now = new Date();
  return { label: now.toLocaleDateString("ru-RU", { month: "short", year: "2-digit" }) };
}
```

In `addPeriod` callback, replace the auto-increment logic (lines 168-178). Instead of month/year math:
```typescript
if (prev.periods.length === 0) {
  newPeriod = createDefaultPeriod();
} else {
  const lastLabel = prev.periods[prev.periods.length - 1].label;
  const periodNum = prev.periods.length + 1;
  newPeriod = { label: `Период ${periodNum}` };
}
```

- [ ] **Step 9: Update useAnalytics.ts — anon dashboard with label periods**

In the `useEffect` where `dashboardId === "new"` creates a local dashboard, `periods: []` stays the same — no change needed.

- [ ] **Step 10: Update generate route**

In `app/api/analytics/generate/route.ts`, replace periodLabels (lines 40-44):
```typescript
const periodLabels = periods
  .map((p: Period) => p.label)
  .join(", ");
```

Add import:
```typescript
import type { Metric, Period, Insight } from "../../../lib/types";
```
(Period is already imported, just ensure it's there)

- [ ] **Step 11: Update share page — migrate periods SSR**

In `app/share/[shareId]/page.tsx`, add import:
```typescript
import { migratePeriod } from "../../lib/utils";
```

Change the DashboardViewWrapper props (line 56-58):
```typescript
<DashboardViewWrapper
  metrics={row.data?.metrics ?? []}
  periods={(row.data?.periods ?? []).map(migratePeriod)}
  insights={row.data?.insights ?? []}
/>
```

- [ ] **Step 12: Run all tests**

```bash
npx tsc --noEmit && npm test
```
Expected: clean, all tests pass

- [ ] **Step 13: Commit**

```bash
git add app/lib/types.ts app/lib/utils.ts app/components/MetricInput.tsx app/components/ChartBlock.tsx app/hooks/useAnalytics.ts app/api/analytics/generate/route.ts "app/share/[shareId]/page.tsx" app/__tests__/analytics-utils.test.ts
git commit -m "refactor(analytics): Period { label } вместо { month, year } + миграция"
```

---

## Task 3: CSV parser — pure function with tests

**Files:**
- Create: `app/lib/csv-parser.ts`
- Create: `app/__tests__/csv-parser.test.ts`

- [ ] **Step 1: Write tests**

Create `app/__tests__/csv-parser.test.ts`:

```typescript
import { parseCSVToMetrics } from "../lib/csv-parser"

describe("parseCSVToMetrics", () => {
  it("parses simple two-column CSV (text + number)", () => {
    const data = [
      { p1: "chatType_chat", "Сумма hits": 44295 },
      { p1: "chatType_user", "Сумма hits": 44077 },
      { p1: "chatType_notes", "Сумма hits": 7126 },
    ]
    const result = parseCSVToMetrics(data)
    expect(result.periods).toHaveLength(3)
    expect(result.periods[0].label).toBe("chatType_chat")
    expect(result.metrics).toHaveLength(1)
    expect(result.metrics[0].name).toBe("Сумма hits")
    expect(result.metrics[0].rows[0].values).toEqual([44295, 44077, 7126])
  })

  it("aggregates rows with duplicate labels", () => {
    const data = [
      { Год: 2025, Месяц: "Ноябрь", День: 6, "Сумма hits": 100 },
      { Год: 2025, Месяц: "Ноябрь", День: 7, "Сумма hits": 200 },
      { Год: 2025, Месяц: "Декабрь", День: 1, "Сумма hits": 300 },
    ]
    const result = parseCSVToMetrics(data)
    // Год has 1 unique value → reclassified as text
    // Labels: "2025 · Ноябрь", "2025 · Декабрь"
    expect(result.periods).toHaveLength(2)
    expect(result.metrics.length).toBeGreaterThanOrEqual(1)
    // "Сумма hits" aggregated: Ноябрь = 300, Декабрь = 300
    const hitsMetric = result.metrics.find(m => m.name === "Сумма hits")
    expect(hitsMetric).toBeDefined()
    expect(hitsMetric!.rows[0].values).toEqual([300, 300])
  })

  it("handles multiple numeric columns as separate metrics", () => {
    const data = [
      { name: "A", revenue: 100, users: 10 },
      { name: "B", revenue: 200, users: 20 },
    ]
    const result = parseCSVToMetrics(data)
    expect(result.periods).toHaveLength(2)
    expect(result.metrics).toHaveLength(2)
    expect(result.metrics.map(m => m.name).sort()).toEqual(["revenue", "users"])
  })

  it("returns null for empty data", () => {
    expect(parseCSVToMetrics([])).toBeNull()
  })

  it("returns null when no numeric columns found", () => {
    const data = [
      { a: "foo", b: "bar" },
      { a: "baz", b: "qux" },
    ]
    expect(parseCSVToMetrics(data)).toBeNull()
  })

  it("reclassifies numeric column with few unique values as text", () => {
    const data = [
      { year: 2025, month: "Jan", value: 100 },
      { year: 2025, month: "Feb", value: 200 },
      { year: 2026, month: "Jan", value: 300 },
      { year: 2026, month: "Feb", value: 400 },
    ]
    const result = parseCSVToMetrics(data)
    // year has 2 unique values → reclassified as text
    // labels: "2025 · Jan", "2025 · Feb", "2026 · Jan", "2026 · Feb"
    expect(result).not.toBeNull()
    expect(result!.periods).toHaveLength(4)
    expect(result!.metrics).toHaveLength(1)
    expect(result!.metrics[0].name).toBe("value")
  })

  it("generates row labels when no text columns", () => {
    const data = [
      { a: 10, b: 20 },
      { a: 30, b: 40 },
    ]
    const result = parseCSVToMetrics(data)
    expect(result).not.toBeNull()
    expect(result!.periods[0].label).toBe("1")
    expect(result!.periods[1].label).toBe("2")
  })
})
```

- [ ] **Step 2: Run tests — should fail**

```bash
npx vitest run app/__tests__/csv-parser.test.ts
```
Expected: FAIL — module not found

- [ ] **Step 3: Implement parseCSVToMetrics**

Create `app/lib/csv-parser.ts`:

```typescript
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
      if (uniqueCount <= 5) {
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
    return textCols.map(col => String(row[col] ?? "")).join(" · ")
  })

  // Step 3: Group by label and aggregate (sum)
  const uniqueLabels: string[] = []
  const labelIndexMap = new Map<string, number>()
  // For each numeric column, accumulate sums per label
  const sums: Map<string, number[]> = new Map() // label → [sum per numericCol]

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

  const metrics: Metric[] = numericCols.map(colName => ({
    id: crypto.randomUUID(),
    name: colName,
    rows: [{
      label: "",
      values: uniqueLabels.map(label => sums.get(label)![numericCols.indexOf(colName)]),
    }],
  }))

  return { periods, metrics }
}
```

- [ ] **Step 4: Run tests — should pass**

```bash
npx vitest run app/__tests__/csv-parser.test.ts
```
Expected: all pass

- [ ] **Step 5: Run full test suite**

```bash
npx tsc --noEmit && npm test
```
Expected: clean, all tests pass

- [ ] **Step 6: Commit**

```bash
git add app/lib/csv-parser.ts app/__tests__/csv-parser.test.ts
git commit -m "feat(analytics): CSV парсер с авто-определением столбцов и агрегацией"
```

---

## Task 4: CsvUploadButton component + wire up

**Files:**
- Create: `app/components/CsvUploadButton.tsx`
- Modify: `app/tools/analytics/[id]/page.tsx`

- [ ] **Step 1: Create CsvUploadButton**

Create `app/components/CsvUploadButton.tsx`:

```typescript
"use client"

import { useRef } from "react"
import Papa from "papaparse"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { parseCSVToMetrics } from "../lib/csv-parser"
import type { Period, Metric } from "../lib/types"

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

interface CsvUploadButtonProps {
  onImport: (data: { periods: Period[]; metrics: Metric[] }) => void
}

export function CsvUploadButton({ onImport }: CsvUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      toast.error("Файл слишком большой (максимум 5 МБ)")
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      if (!text?.trim()) {
        toast.error("Файл пустой")
        return
      }

      const parsed = Papa.parse(text, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
      })

      if (parsed.errors.length > 0 && parsed.data.length === 0) {
        toast.error("Не удалось прочитать файл")
        return
      }

      const result = parseCSVToMetrics(parsed.data as Record<string, unknown>[])
      if (!result) {
        toast.error("В файле не найдено числовых данных")
        return
      }

      onImport(result)
      toast.success(`Загружено: ${result.metrics.length} метрик, ${result.periods.length} периодов`)
    }

    reader.onerror = () => toast.error("Не удалось прочитать файл")
    reader.readAsText(file)
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.tsv,.txt"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ""
        }}
      />
      <Button variant="outline" onClick={() => inputRef.current?.click()}>
        📄 Загрузить CSV
      </Button>
    </>
  )
}
```

- [ ] **Step 2: Wire up in editor page**

In `app/tools/analytics/[id]/page.tsx`:

Add import:
```typescript
import { CsvUploadButton } from "../../../components/CsvUploadButton";
```

Add handler inside component (after existing handlers):
```typescript
const handleCsvImport = (data: { periods: Period[]; metrics: Metric[] }) => {
  updateDashboard({ periods: data.periods, metrics: data.metrics, insights: [] });
};
```

Add `Period` to the type import:
```typescript
import type { Metric, Period } from "../../../lib/types";
```

In the button panel (where `+ Добавить метрику` and `+ Добавить период` are), add:
```tsx
<CsvUploadButton onImport={handleCsvImport} />
```

- [ ] **Step 3: Verify build + tests**

```bash
npx tsc --noEmit && npm test
```
Expected: clean, all pass

- [ ] **Step 4: Commit**

```bash
git add app/components/CsvUploadButton.tsx "app/tools/analytics/[id]/page.tsx"
git commit -m "feat(analytics): кнопка загрузки CSV с авто-определением данных"
```

---

## Final Verification

- [ ] **Full check**

```bash
npx tsc --noEmit && npm test
```

- [ ] **Manual test checklist (for user)**

1. Open `/tools/analytics/new`
2. Click "📄 Загрузить CSV" → select a CSV file
3. Data appears in metric cards immediately
4. Click "Анализировать" → AI analysis works with new Period labels
5. Open an old dashboard (with month/year periods) → migrated labels display correctly
6. Share page (`/share/[id]`) → migrated labels display correctly
7. Error: upload a non-CSV file → toast error
8. Error: upload a CSV with only text → toast "не найдено числовых данных"
