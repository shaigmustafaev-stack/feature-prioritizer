# Product Analytics Dashboard — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a product analytics tool where PMs input metrics and get dashboards with charts + AI insights.

**Architecture:** Two-page tool (list + dashboard with tabs), JSONB storage in Supabase, recharts for visualization, Claude API for insights via REST fetch. Deterministic chart type selection via pure function rules.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS 4, shadcn/ui, recharts, Supabase (PostgreSQL + Auth + RLS), Claude API (REST).

**Spec:** `docs/superpowers/specs/2026-03-13-analytics-design.md`

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `app/lib/types.ts` | Add analytics types (Metric, MetricRow, Period, ChartType, Insight, Dashboard) |
| Modify | `app/lib/utils.ts` | Add pickChartType, calcDelta, formatMetricValue |
| Create | `app/hooks/useAnalytics.ts` | Dashboard state, CRUD, API calls, auto-save |
| Create | `app/components/MetricInput.tsx` | Single metric input block (name, segment, values table) |
| Create | `app/components/KpiCard.tsx` | KPI card: value + delta arrow |
| Create | `app/components/ChartBlock.tsx` | recharts chart + AI insight text |
| Create | `app/components/DashboardView.tsx` | Composes KpiCards + ChartBlocks |
| Create | `app/components/ShareModal.tsx` | Share link modal with copy button |
| Create | `app/api/analytics/dashboards/route.ts` | GET/POST/PUT/DELETE dashboards CRUD |
| Create | `app/api/analytics/generate/route.ts` | POST: Claude API call for insights |
| Create | `app/api/analytics/share/route.ts` | POST: generate share_id |
| Create | `app/tools/analytics/page.tsx` | Dashboard list page (Screen 1) |
| Create | `app/tools/analytics/[id]/page.tsx` | Dashboard editor with tabs (Screen 2) |
| Create | `app/share/[shareId]/page.tsx` | Public read-only dashboard (Server Component) |
| Create | `app/share/[shareId]/DashboardViewWrapper.tsx` | Client wrapper for DashboardView in share page |
| Create | `app/__tests__/analytics-utils.test.ts` | Unit tests for pickChartType, calcDelta, formatMetricValue |
| Create | `app/__tests__/analytics-page.test.tsx` | Integration tests for analytics pages |
| Modify | `app/page.tsx` | Add "Аналитика продукта" card to tools grid |

---

## Chunk 1: Foundation (Types, Utilities, Dependencies)

### Task 1: Install recharts

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install recharts**

```bash
npm install recharts
```

- [ ] **Step 2: Verify installation**

```bash
npm ls recharts
```

Expected: `recharts@2.x.x`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(analytics): install recharts for chart visualization"
```

---

### Task 2: Add analytics types

**Files:**
- Modify: `app/lib/types.ts` (currently 32 lines, append after line 31)

- [ ] **Step 1: Write the types**

Add to end of `app/lib/types.ts`:

```typescript
// --- Analytics ---

export interface MetricRow {
  label: string
  values: number[]
}

export interface Metric {
  id: string
  name: string
  segmentTag?: string
  rows: MetricRow[]
}

export interface Period {
  month: number
  year: number
}

export type ChartType = "line" | "bar" | "pie" | "horizontal-bar"

export interface Insight {
  metricId: string
  text: string
}

export interface Dashboard {
  id: string
  name: string
  periods: Period[]
  metrics: Metric[]
  insights: Insight[]
  created_at: string
  user_id: string
  share_id?: string
}

/** Raw row from Supabase — data is JSONB, not expanded */
export interface DashboardRow {
  id: string
  name: string
  data: { periods: Period[]; metrics: Metric[]; insights: Insight[] }
  share_id: string | null
  user_id: string
  created_at: string
}
```

Note: `Period.label` is NOT stored — it's computed at render time from `month` and `year` using `toLocaleDateString`. This avoids locale bugs if a stored label doesn't match the user's locale.

- [ ] **Step 2: Verify build compiles**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add app/lib/types.ts
git commit -m "feat(analytics): add Metric, Dashboard, Insight types"
```

---

### Task 3: Add utility functions — write failing tests first

**Files:**
- Create: `app/__tests__/analytics-utils.test.ts`
- Modify: `app/lib/utils.ts` (currently 57 lines)

- [ ] **Step 1: Write failing tests for pickChartType**

Create `app/__tests__/analytics-utils.test.ts`:

```typescript
import { describe, it, expect } from "vitest"
import { pickChartType, calcDelta, formatMetricValue } from "../lib/utils"
import type { Metric } from "../lib/types"

const makeMetric = (rows: number): Metric => ({
  id: "m1",
  name: "Test",
  rows: Array.from({ length: rows }, (_, i) => ({
    label: `Segment ${i}`,
    values: [100, 200, 300],
  })),
})

describe("pickChartType", () => {
  it("returns line for 1 row, 3+ periods", () => {
    expect(pickChartType(makeMetric(1), 3)).toBe("line")
  })

  it("returns bar for 1 row, 1-2 periods", () => {
    expect(pickChartType(makeMetric(1), 2)).toBe("bar")
  })

  it("returns bar (grouped) for 2-5 segments, 2+ periods", () => {
    expect(pickChartType(makeMetric(3), 3)).toBe("bar")
  })

  it("returns line for 6+ segments, 2+ periods (bar unreadable)", () => {
    expect(pickChartType(makeMetric(7), 3)).toBe("line")
  })

  it("returns pie for 1 period, 2-5 segments", () => {
    expect(pickChartType(makeMetric(3), 1)).toBe("pie")
  })

  it("returns horizontal-bar for 1 period, 6+ segments", () => {
    expect(pickChartType(makeMetric(8), 1)).toBe("horizontal-bar")
  })

  it("returns bar as fallback", () => {
    expect(pickChartType(makeMetric(1), 1)).toBe("bar")
  })
})

describe("calcDelta", () => {
  it("calculates positive delta", () => {
    const result = calcDelta([100, 150])
    expect(result.value).toBe(50)
    expect(result.percent).toBeCloseTo(50)
  })

  it("calculates negative delta", () => {
    const result = calcDelta([200, 150])
    expect(result.value).toBe(-50)
    expect(result.percent).toBeCloseTo(-25)
  })

  it("returns zero for single value", () => {
    const result = calcDelta([100])
    expect(result.value).toBe(0)
    expect(result.percent).toBe(0)
  })

  it("returns zero for empty array", () => {
    const result = calcDelta([])
    expect(result.value).toBe(0)
    expect(result.percent).toBe(0)
  })

  it("handles zero base (avoid division by zero)", () => {
    const result = calcDelta([0, 100])
    expect(result.value).toBe(100)
    expect(result.percent).toBe(0)
  })
})

describe("formatMetricValue", () => {
  it("formats millions", () => {
    expect(formatMetricValue(1500000)).toBe("1.5M")
  })

  it("formats thousands", () => {
    expect(formatMetricValue(340000)).toBe("340K")
  })

  it("formats small numbers as-is", () => {
    expect(formatMetricValue(42)).toBe("42")
  })

  it("formats exact million", () => {
    expect(formatMetricValue(1000000)).toBe("1M")
  })

  it("formats exact thousand", () => {
    expect(formatMetricValue(1000)).toBe("1K")
  })

  it("handles zero", () => {
    expect(formatMetricValue(0)).toBe("0")
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run app/__tests__/analytics-utils.test.ts
```

Expected: FAIL — `pickChartType`, `calcDelta`, `formatMetricValue` not exported from `../lib/utils`

- [ ] **Step 3: Implement pickChartType**

Add to end of `app/lib/utils.ts`:

```typescript
import type { Metric, ChartType } from "./types"

export const pickChartType = (metric: Metric, periodsCount: number): ChartType => {
  const segmentCount = metric.rows.length

  if (periodsCount === 1) {
    if (segmentCount >= 6) return "horizontal-bar"
    if (segmentCount >= 2) return "pie"
    return "bar"
  }

  if (segmentCount <= 1 && periodsCount >= 3) return "line"
  if (segmentCount >= 6) return "line"
  if (segmentCount >= 2) return "bar"

  return "bar"
}
```

**Important:** Add `Metric, ChartType` to the existing import at line 2 of `app/lib/utils.ts`. The existing import is:
```typescript
import type { Feature, FormState, FormErrors, ScoringMode } from "./types"
```
Change it to:
```typescript
import type { Feature, FormState, FormErrors, ScoringMode, Metric, ChartType } from "./types"
```
Do NOT add a separate `import` statement — ESM requires all imports at the top of the file.

- [ ] **Step 4: Implement calcDelta**

Add to `app/lib/utils.ts`:

```typescript
export const calcDelta = (values: number[]): { value: number; percent: number } => {
  if (values.length < 2) return { value: 0, percent: 0 }
  const prev = values[values.length - 2]
  const curr = values[values.length - 1]
  const value = curr - prev
  const percent = prev !== 0 ? (value / prev) * 100 : 0
  return { value, percent }
}
```

- [ ] **Step 5: Implement formatMetricValue**

Add to `app/lib/utils.ts`:

```typescript
export const formatMetricValue = (value: number): string => {
  if (value >= 1_000_000) {
    const m = value / 1_000_000
    return m % 1 === 0 ? `${m}M` : `${parseFloat(m.toFixed(1))}M`
  }
  if (value >= 1_000) {
    const k = value / 1_000
    return k % 1 === 0 ? `${k}K` : `${parseFloat(k.toFixed(1))}K`
  }
  return String(value)
}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npx vitest run app/__tests__/analytics-utils.test.ts
```

Expected: all 13 tests PASS

- [ ] **Step 7: Run full test suite to check no regressions**

```bash
npm test
```

Expected: all existing tests + new tests pass

- [ ] **Step 8: Commit**

```bash
git add app/lib/utils.ts app/lib/types.ts app/__tests__/analytics-utils.test.ts
git commit -m "feat(analytics): add pickChartType, calcDelta, formatMetricValue with tests"
```

---

## Chunk 2: API Routes

### Task 4: Create Supabase table

**Files:** none (SQL executed in Supabase Dashboard or via MCP)

- [ ] **Step 1: Create dashboards table in Supabase SQL Editor**

```sql
CREATE TABLE dashboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  share_id TEXT UNIQUE,
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE dashboards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own dashboards" ON dashboards
  FOR ALL USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Public read by share_id" ON dashboards
  FOR SELECT USING (share_id IS NOT NULL);
```

- [ ] **Step 2: Verify table exists**

Run a test query in Supabase SQL Editor:

```sql
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'dashboards';
```

Expected: id (uuid), name (text), data (jsonb), share_id (text), user_id (text), created_at (timestamptz)

---

### Task 5: CRUD API route for dashboards

**Files:**
- Create: `app/api/analytics/dashboards/route.ts`

- [ ] **Step 1: Create the API route**

Create `app/api/analytics/dashboards/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "../../../lib/supabase-server"
import type { SupabaseClient } from "@supabase/supabase-js"

async function getAuthUser(supabase: SupabaseClient) {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function GET() {
  const supabase = await supabaseServer()
  const user = await getAuthUser(supabase)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data, error } = await supabase
    .from("dashboards")
    .select("id, name, data, share_id, user_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = await supabaseServer()
  const user = await getAuthUser(supabase)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const name = body.name || "Новый дашборд"
  const { data, error } = await supabase
    .from("dashboards")
    .insert({
      name,
      data: body.data || { periods: [], metrics: [], insights: [] },
      user_id: user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(req: NextRequest) {
  const supabase = await supabaseServer()
  const user = await getAuthUser(supabase)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 })
  const updateData: Record<string, unknown> = {}
  if (body.name !== undefined) updateData.name = body.name
  if (body.data !== undefined) updateData.data = body.data

  const { data, error } = await supabase
    .from("dashboards")
    .update(updateData)
    .eq("id", body.id)
    .eq("user_id", user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const supabase = await supabaseServer()
  const user = await getAuthUser(supabase)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 })
  const { error } = await supabase
    .from("dashboards")
    .delete()
    .eq("id", body.id)
    .eq("user_id", user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 2: Verify build**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add app/api/analytics/dashboards/route.ts
git commit -m "feat(analytics): add dashboards CRUD API route"
```

---

### Task 6: Generate insights API route (Claude API)

**Files:**
- Create: `app/api/analytics/generate/route.ts`

- [ ] **Step 1: Create the generate route**

Create `app/api/analytics/generate/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "../../../lib/supabase-server"
import type { Metric, Period, Insight } from "../../../lib/types"

const RATE_LIMIT_MS = 30_000
const lastRequestByUser = new Map<string, number>()

function formatPeriodLabel(p: Period): string {
  const date = new Date(p.year, p.month)
  return date.toLocaleDateString("ru-RU", { month: "short", year: "2-digit" })
}

export async function POST(req: NextRequest) {
  const supabase = await supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Rate limit
  const now = Date.now()
  const last = lastRequestByUser.get(user.id) || 0
  if (now - last < RATE_LIMIT_MS) {
    const wait = Math.ceil((RATE_LIMIT_MS - (now - last)) / 1000)
    return NextResponse.json(
      { error: `Подождите ${wait} сек перед следующим запросом` },
      { status: 429 }
    )
  }
  lastRequestByUser.set(user.id, now)

  const body = await req.json()
  const metrics: Metric[] = body.metrics
  const periods: Period[] = body.periods

  if (!metrics?.length || !periods?.length) {
    return NextResponse.json({ error: "Метрики и периоды обязательны" }, { status: 400 })
  }

  const periodLabels = periods.map(formatPeriodLabel).join(", ")

  const prompt = `Ты — продуктовый аналитик. Отвечай на русском.

Для каждой метрики дай вывод в формате:
1. Что происходит (факт с конкретными цифрами из данных)
2. Почему (гипотеза на основе трендов)
3. Что делать (1 конкретная рекомендация для PM)

Не более 3-4 предложений на метрику. Без воды и общих фраз.

Метрики: ${JSON.stringify(metrics)}
Периоды: ${periodLabels}

Верни ответ строго в JSON формате:
[{"metricId": "<id метрики>", "text": "<вывод>"}]
Без markdown, без \`\`\`, только JSON массив.`

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6-20250514",
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      console.error("Claude API error:", errorBody)
      return NextResponse.json({ error: "Ошибка AI-сервиса" }, { status: 502 })
    }

    const result = await response.json()
    const text = result.content[0]?.text || "[]"

    let insights: Insight[]
    try {
      insights = JSON.parse(text)
    } catch {
      insights = metrics.map((m) => ({ metricId: m.id, text }))
    }

    return NextResponse.json({ insights })
  } catch (err) {
    console.error("Claude API request failed:", err)
    return NextResponse.json({ error: "Ошибка запроса к AI" }, { status: 500 })
  }
}
```

- [ ] **Step 2: Add ANTHROPIC_API_KEY to .env.local**

Add to `.env.local` (create if doesn't exist):

```
ANTHROPIC_API_KEY=sk-ant-...
```

Also add `ANTHROPIC_API_KEY` to Vercel Environment Variables in the project settings.

- [ ] **Step 3: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add app/api/analytics/generate/route.ts
git commit -m "feat(analytics): add Claude API insights generation route"
```

---

### Task 7: Share API route

**Files:**
- Create: `app/api/analytics/share/route.ts`

- [ ] **Step 1: Create the share route**

Create `app/api/analytics/share/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "../../../lib/supabase-server"

function generateShareId(): string {
  return Math.random().toString(36).substring(2, 10) +
    Math.random().toString(36).substring(2, 10)
}

export async function POST(req: NextRequest) {
  const supabase = await supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 })

  // Check if already has share_id
  const { data: existing } = await supabase
    .from("dashboards")
    .select("share_id")
    .eq("id", body.id)
    .eq("user_id", user.id)
    .single()

  if (existing?.share_id) {
    return NextResponse.json({ shareId: existing.share_id })
  }

  const shareId = generateShareId()
  const { error } = await supabase
    .from("dashboards")
    .update({ share_id: shareId })
    .eq("id", body.id)
    .eq("user_id", user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ shareId })
}
```

- [ ] **Step 2: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/api/analytics/share/route.ts
git commit -m "feat(analytics): add share link generation route"
```

---

## Chunk 3: UI Components

### Task 8: KpiCard component

**Files:**
- Create: `app/components/KpiCard.tsx`

- [ ] **Step 1: Create KpiCard**

Create `app/components/KpiCard.tsx`:

```tsx
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
        <p
          className={`text-sm font-medium ${
            delta.value > 0 ? "text-green-600" : "text-red-500"
          }`}
        >
          {delta.value > 0 ? "▲" : "▼"} {Math.abs(delta.percent).toFixed(1)}%
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/components/KpiCard.tsx
git commit -m "feat(analytics): add KpiCard component"
```

---

### Task 9: ChartBlock component

**Files:**
- Create: `app/components/ChartBlock.tsx`

- [ ] **Step 1: Create ChartBlock**

Create `app/components/ChartBlock.tsx`:

```tsx
"use client"

import {
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from "recharts"
import type { ChartType, Metric, Period } from "../lib/types"
import { pickChartType, formatMetricValue } from "../lib/utils"

const COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"]

interface ChartBlockProps {
  metric: Metric
  periods: Period[]
  insight?: string
  analyzing?: boolean
}

function formatPeriodLabel(p: Period): string {
  const date = new Date(p.year, p.month)
  return date.toLocaleDateString("ru-RU", { month: "short", year: "2-digit" })
}

export function ChartBlock({ metric, periods, insight, analyzing }: ChartBlockProps) {
  const chartType = pickChartType(metric, periods.length)
  const periodLabels = periods.map(formatPeriodLabel)

  // Build data for recharts
  const data = periodLabels.map((label, i) => {
    const point: Record<string, string | number> = { period: label }
    metric.rows.forEach((row) => {
      const key = row.label || metric.name
      point[key] = row.values[i] ?? 0
    })
    return point
  })

  const rowKeys = metric.rows.map((r) => r.label || metric.name)

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <h3 className="font-semibold text-base">
        {metric.name}
        {metric.segmentTag && (
          <span className="ml-2 text-sm text-muted-foreground font-normal">
            {metric.segmentTag}
          </span>
        )}
      </h3>

      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === "line" ? (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="period" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={formatMetricValue} />
              <Tooltip formatter={(v: number) => formatMetricValue(v)} />
              {rowKeys.length > 1 && <Legend />}
              {rowKeys.map((key, i) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              ))}
            </LineChart>
          ) : chartType === "pie" ? (
            <PieChart>
              <Pie
                data={metric.rows.map((r) => ({
                  name: r.label || metric.name,
                  value: r.values[0] ?? 0,
                }))}
                cx="50%"
                cy="50%"
                outerRadius={100}
                dataKey="value"
                label={({ name, percent }) =>
                  `${name}: ${(percent * 100).toFixed(0)}%`
                }
              >
                {metric.rows.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => formatMetricValue(v)} />
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
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={formatMetricValue} />
                </>
              )}
              <Tooltip formatter={(v: number) => formatMetricValue(v)} />
              {rowKeys.length > 1 && <Legend />}
              {rowKeys.map((key, i) => (
                <Bar key={key} dataKey={key} fill={COLORS[i % COLORS.length]} />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* AI Insight */}
      <div className="pt-2 border-t">
        {analyzing ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            Анализирую...
          </div>
        ) : insight ? (
          <p className="text-sm text-muted-foreground leading-relaxed">{insight}</p>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            Нажмите «Анализировать» для получения AI-выводов
          </p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/components/ChartBlock.tsx
git commit -m "feat(analytics): add ChartBlock component with recharts"
```

---

### Task 10: MetricInput component

**Files:**
- Create: `app/components/MetricInput.tsx`

- [ ] **Step 1: Create MetricInput**

Create `app/components/MetricInput.tsx`:

```tsx
"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import type { Metric, Period } from "../lib/types"

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
}

function formatPeriodLabel(p: Period): string {
  const date = new Date(p.year, p.month)
  return date.toLocaleDateString("ru-RU", { month: "short", year: "2-digit" })
}

export function MetricInput({ metric, periods, onUpdate, onRemove }: MetricInputProps) {
  const updateName = (name: string) => {
    onUpdate({ ...metric, name })
  }

  const updateSegmentTag = (tag: string | null) => {
    if (tag === null) return
    const newMetric = { ...metric, segmentTag: tag || undefined }
    if (!tag && metric.rows.length > 1) {
      // Remove all segments except first when switching to "no segment"
      newMetric.rows = [{ label: "", values: metric.rows[0]?.values || periods.map(() => 0) }]
    }
    onUpdate(newMetric)
  }

  const updateValue = (rowIdx: number, colIdx: number, val: string) => {
    const rows = metric.rows.map((row, ri) => {
      if (ri !== rowIdx) return row
      const values = [...row.values]
      values[colIdx] = val === "" ? 0 : Number(val)
      return { ...row, values }
    })
    onUpdate({ ...metric, rows })
  }

  const updateRowLabel = (rowIdx: number, label: string) => {
    const rows = metric.rows.map((row, ri) =>
      ri === rowIdx ? { ...row, label } : row
    )
    onUpdate({ ...metric, rows })
  }

  const addSegment = () => {
    const newRow = { label: "", values: periods.map(() => 0) }
    onUpdate({ ...metric, rows: [...metric.rows, newRow] })
  }

  const removeSegment = (rowIdx: number) => {
    if (metric.rows.length <= 1) return
    onUpdate({ ...metric, rows: metric.rows.filter((_, i) => i !== rowIdx) })
  }

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Input
          value={metric.name}
          onChange={(e) => updateName(e.target.value)}
          placeholder="Название метрики"
          className="font-medium"
        />
        <Select value={metric.segmentTag || ""} onValueChange={updateSegmentTag}>
          <SelectTrigger className="w-[180px] shrink-0" aria-label="Разрез">
            <SelectValue placeholder="Без разреза" />
          </SelectTrigger>
          <SelectContent>
            {SEGMENT_PRESETS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="ghost" size="sm" onClick={onRemove} className="text-red-500 shrink-0">
          Удалить
        </Button>
      </div>

      {/* Values table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              {metric.segmentTag && <th className="text-left p-1 text-muted-foreground">Сегмент</th>}
              {periods.map((p, i) => (
                <th key={i} className="text-center p-1 text-muted-foreground min-w-[90px]">
                  {formatPeriodLabel(p)}
                </th>
              ))}
              {metric.segmentTag && <th className="w-8" />}
            </tr>
          </thead>
          <tbody>
            {metric.rows.map((row, ri) => (
              <tr key={ri}>
                {metric.segmentTag && (
                  <td className="p-1">
                    <Input
                      value={row.label}
                      onChange={(e) => updateRowLabel(ri, e.target.value)}
                      placeholder={`Сегмент ${ri + 1}`}
                      className="h-8 text-sm"
                    />
                  </td>
                )}
                {periods.map((_, ci) => (
                  <td key={ci} className="p-1">
                    <Input
                      type="number"
                      value={row.values[ci] || ""}
                      onChange={(e) => updateValue(ri, ci, e.target.value)}
                      className="h-8 text-sm text-center"
                      placeholder="0"
                    />
                  </td>
                ))}
                {metric.segmentTag && metric.rows.length > 1 && (
                  <td className="p-1">
                    <Button variant="ghost" size="sm" onClick={() => removeSegment(ri)} className="h-8 w-8 p-0 text-muted-foreground">
                      ×
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {metric.segmentTag && (
        <Button variant="outline" size="sm" onClick={addSegment}>
          + Добавить сегмент
        </Button>
      )}
    </div>
  )
}
```

**Important:** The Select component uses shadcn/base-ui API. If the existing Select component in `components/ui/select.tsx` has a different API (check during implementation), adapt accordingly. The key: `onValueChange` returns `string | null` — must guard against null.

- [ ] **Step 2: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/components/MetricInput.tsx
git commit -m "feat(analytics): add MetricInput component"
```

---

### Task 11: DashboardView component

**Files:**
- Create: `app/components/DashboardView.tsx`

- [ ] **Step 1: Create DashboardView**

Create `app/components/DashboardView.tsx`:

```tsx
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

  // Aggregate KPI values: for each metric, sum all rows' last value
  const kpiData = metrics.map((m) => ({
    name: m.name,
    values: m.rows.length === 1
      ? m.rows[0].values
      : m.rows[0].values.map((_, colIdx) =>
          m.rows.reduce((sum, row) => sum + (row.values[colIdx] ?? 0), 0)
        ),
  }))

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {kpiData.map((kpi) => (
          <KpiCard key={kpi.name} name={kpi.name} values={kpi.values} />
        ))}
      </div>

      {/* Charts + Insights */}
      <div className="space-y-4">
        {metrics.map((metric) => {
          const metricInsight = insights.find((ins) => ins.metricId === metric.id)
          return (
            <ChartBlock
              key={metric.id}
              metric={metric}
              periods={periods}
              insight={metricInsight?.text}
              analyzing={analyzing}
            />
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/components/DashboardView.tsx
git commit -m "feat(analytics): add DashboardView component"
```

---

### Task 12: ShareModal component

**Files:**
- Create: `app/components/ShareModal.tsx`

- [ ] **Step 1: Create ShareModal**

Create `app/components/ShareModal.tsx`:

```tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface ShareModalProps {
  shareId: string | null
  onClose: () => void
}

export function ShareModal({ shareId, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false)

  if (!shareId) return null

  const shareUrl = `${window.location.origin}/share/${shareId}`

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-card rounded-xl border p-6 w-full max-w-md space-y-4 mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">Поделиться дашбордом</h2>
        <p className="text-sm text-muted-foreground">
          Любой с этой ссылкой может просматривать дашборд (без редактирования)
        </p>
        <div className="flex gap-2">
          <Input value={shareUrl} readOnly className="text-sm" />
          <Button onClick={handleCopy} className="shrink-0">
            {copied ? "Скопировано!" : "Копировать"}
          </Button>
        </div>
        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>Закрыть</Button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/components/ShareModal.tsx
git commit -m "feat(analytics): add ShareModal component"
```

---

## Chunk 4: Hook, Pages, Navigation

### Task 13: useAnalytics hook

**Files:**
- Create: `app/hooks/useAnalytics.ts`

- [ ] **Step 1: Create the hook**

Create `app/hooks/useAnalytics.ts`:

```typescript
"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import type { Dashboard, DashboardRow, Metric, Period, Insight } from "../lib/types"

type AuthUser = { id: string; email?: string | null }

function createEmptyMetric(): Metric {
  return {
    id: crypto.randomUUID(),
    name: "",
    rows: [{ label: "", values: [] }],
  }
}

function createDefaultPeriod(): Period {
  const now = new Date()
  return { month: now.getMonth(), year: now.getFullYear() }
}

export function useAnalytics(dashboardId: string, user: AuthUser | null) {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"data" | "dashboard">("data")
  const [shareModalId, setShareModalId] = useState<string | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dashboardRef = useRef<Dashboard | null>(null)

  // Keep ref in sync for use in autoSave (avoids stale closures)
  dashboardRef.current = dashboard

  // Load dashboard
  useEffect(() => {
    if (!user) { setLoading(false); return }

    const load = async () => {
      try {
        const res = await fetch("/api/analytics/dashboards")
        if (!res.ok) throw new Error("Failed to load")
        const list: DashboardRow[] = await res.json()
        const found = list.find((d) => d.id === dashboardId)
        if (found) {
          setDashboard({
            id: found.id,
            name: found.name,
            user_id: found.user_id,
            created_at: found.created_at,
            share_id: found.share_id ?? undefined,
            periods: found.data?.periods || [createDefaultPeriod()],
            metrics: found.data?.metrics || [createEmptyMetric()],
            insights: found.data?.insights || [],
          })
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ошибка загрузки")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [dashboardId, user])

  // Auto-save (debounced 5s) — uses ref to avoid stale closures
  const autoSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      const d = dashboardRef.current
      if (!d || !user) return
      fetch("/api/analytics/dashboards", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: d.id,
          name: d.name,
          data: { periods: d.periods, metrics: d.metrics, insights: d.insights },
        }),
      }).catch(console.error)
    }, 5000)
  }, [user])

  const updateDashboard = useCallback((updates: Partial<Dashboard>) => {
    setDashboard((prev) => {
      if (!prev) return prev
      return { ...prev, ...updates }
    })
    autoSave()
  }, [autoSave])

  // Metrics
  const addMetric = useCallback(() => {
    if (!dashboard) return
    const newMetric = createEmptyMetric()
    newMetric.rows[0].values = dashboard.periods.map(() => 0)
    updateDashboard({ metrics: [...dashboard.metrics, newMetric] })
  }, [dashboard, updateDashboard])

  const removeMetric = useCallback((id: string) => {
    if (!dashboard) return
    updateDashboard({ metrics: dashboard.metrics.filter((m) => m.id !== id) })
  }, [dashboard, updateDashboard])

  const updateMetric = useCallback((updated: Metric) => {
    if (!dashboard) return
    updateDashboard({
      metrics: dashboard.metrics.map((m) => (m.id === updated.id ? updated : m)),
    })
  }, [dashboard, updateDashboard])

  // Periods
  const addPeriod = useCallback(() => {
    if (!dashboard) return
    const lastPeriod = dashboard.periods[dashboard.periods.length - 1] || createDefaultPeriod()
    let nextMonth = lastPeriod.month + 1
    let nextYear = lastPeriod.year
    if (nextMonth > 11) { nextMonth = 0; nextYear++ }

    const newPeriod: Period = { month: nextMonth, year: nextYear }
    const metrics = dashboard.metrics.map((m) => ({
      ...m,
      rows: m.rows.map((r) => ({ ...r, values: [...r.values, 0] })),
    }))
    updateDashboard({ periods: [...dashboard.periods, newPeriod], metrics })
  }, [dashboard, updateDashboard])

  const removePeriod = useCallback((index: number) => {
    if (!dashboard || dashboard.periods.length <= 1) return
    const periods = dashboard.periods.filter((_, i) => i !== index)
    const metrics = dashboard.metrics.map((m) => ({
      ...m,
      rows: m.rows.map((r) => ({
        ...r,
        values: r.values.filter((_, i) => i !== index),
      })),
    }))
    updateDashboard({ periods, metrics })
  }, [dashboard, updateDashboard])

  // Analyze
  const analyze = useCallback(async () => {
    if (!dashboard || !user) return
    setAnalyzing(true)
    setError(null)

    try {
      const res = await fetch("/api/analytics/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metrics: dashboard.metrics,
          periods: dashboard.periods,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Ошибка анализа")
      }

      const { insights }: { insights: Insight[] } = await res.json()
      updateDashboard({ insights })
      setActiveTab("dashboard")

      // Force save after analysis
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      await fetch("/api/analytics/dashboards", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: dashboard.id,
          name: dashboard.name,
          data: {
            periods: dashboard.periods,
            metrics: dashboard.metrics,
            insights,
          },
        }),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка")
    } finally {
      setAnalyzing(false)
    }
  }, [dashboard, user, updateDashboard])

  // Save (manual)
  const save = useCallback(async () => {
    if (!dashboard || !user) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    try {
      await fetch("/api/analytics/dashboards", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: dashboard.id,
          name: dashboard.name,
          data: {
            periods: dashboard.periods,
            metrics: dashboard.metrics,
            insights: dashboard.insights,
          },
        }),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка сохранения")
    }
  }, [dashboard, user])

  // Share
  const share = useCallback(async () => {
    if (!dashboard || !user) return
    try {
      const res = await fetch("/api/analytics/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: dashboard.id }),
      })
      if (!res.ok) throw new Error("Ошибка шаринга")
      const { shareId } = await res.json()
      setShareModalId(shareId)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка")
    }
  }, [dashboard, user])

  return {
    dashboard,
    loading,
    analyzing,
    error,
    activeTab,
    setActiveTab,
    shareModalId,
    setShareModalId,
    updateDashboard,
    addMetric,
    removeMetric,
    updateMetric,
    addPeriod,
    removePeriod,
    analyze,
    save,
    share,
  }
}
```

- [ ] **Step 2: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/hooks/useAnalytics.ts
git commit -m "feat(analytics): add useAnalytics hook with CRUD and auto-save"
```

---

### Task 14: Dashboard list page (Screen 1)

**Files:**
- Create: `app/tools/analytics/page.tsx`

- [ ] **Step 1: Create the page**

Create `app/tools/analytics/page.tsx`:

```tsx
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "../../hooks/useAuth"
import type { DashboardRow } from "../../lib/types"

export default function AnalyticsListPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [dashboards, setDashboards] = useState<DashboardRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!user) { setLoading(false); return }

    fetch("/api/analytics/dashboards")
      .then((r) => r.json())
      .then((data) => setDashboards(data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [user, authLoading])

  const createDashboard = async () => {
    if (!user) {
      router.push(`/login?from=/tools/analytics`)
      return
    }
    const res = await fetch("/api/analytics/dashboards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Новый дашборд" }),
    })
    const dashboard = await res.json()
    router.push(`/tools/analytics/${dashboard.id}`)
  }

  const deleteDashboard = async (id: string) => {
    await fetch("/api/analytics/dashboards", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    setDashboards((prev) => prev.filter((d) => d.id !== id))
  }

  if (authLoading || loading) {
    return (
      <div className="max-w-[860px] mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-24 bg-muted rounded" />
          <div className="h-24 bg-muted rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[860px] mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Аналитика продукта</h1>
        <Button onClick={createDashboard}>+ Новый дашборд</Button>
      </div>

      {!user && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <p className="text-lg">Войдите, чтобы создавать и сохранять дашборды</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.push("/login?from=/tools/analytics")}
            >
              Войти
            </Button>
          </CardContent>
        </Card>
      )}

      {user && dashboards.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p className="text-lg">Создайте первый дашборд</p>
            <p className="text-sm mt-1">Введите метрики и получите графики с AI-выводами</p>
          </CardContent>
        </Card>
      )}

      {dashboards.map((d) => {
        const metricsCount = d.data?.metrics?.length ?? 0
        const date = new Date(d.created_at).toLocaleDateString("ru-RU")
        return (
          <Card
            key={d.id}
            className="cursor-pointer hover:-translate-y-0.5 hover:shadow-md transition-all"
            onClick={() => router.push(`/tools/analytics/${d.id}`)}
          >
            <CardContent className="py-4 flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{d.name}</span>
                  <Badge>{metricsCount} метрик</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{date}</p>
              </div>
              <div className="flex items-center gap-2">
                {d.share_id && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      navigator.clipboard.writeText(`${window.location.origin}/share/${d.share_id}`)
                    }}
                  >
                    Ссылка
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500"
                  onClick={(e) => { e.stopPropagation(); deleteDashboard(d.id) }}
                >
                  Удалить
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/tools/analytics/page.tsx
git commit -m "feat(analytics): add dashboard list page"
```

---

### Task 15: Dashboard editor page (Screen 2)

**Files:**
- Create: `app/tools/analytics/[id]/page.tsx`

- [ ] **Step 1: Create the page**

Create `app/tools/analytics/[id]/page.tsx`:

```tsx
"use client"

import { use } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { useAuth } from "../../../hooks/useAuth"
import { useAnalytics } from "../../../hooks/useAnalytics"
import { MetricInput } from "../../../components/MetricInput"
import { DashboardView } from "../../../components/DashboardView"
import { ShareModal } from "../../../components/ShareModal"

interface PageProps {
  params: Promise<{ id: string }>
}

export default function DashboardPage({ params }: PageProps) {
  const { id } = use(params)
  const { user, loading: authLoading } = useAuth()
  const {
    dashboard,
    loading,
    analyzing,
    error,
    activeTab,
    setActiveTab,
    shareModalId,
    setShareModalId,
    updateDashboard,
    addMetric,
    removeMetric,
    updateMetric,
    addPeriod,
    removePeriod,
    analyze,
    save,
    share,
  } = useAnalytics(id, user)

  if (authLoading || loading) {
    return (
      <div className="max-w-[960px] mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-64" />
          <div className="h-12 bg-muted rounded" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    )
  }

  if (!dashboard) {
    return (
      <div className="max-w-[960px] mx-auto px-4 py-8 text-center text-muted-foreground">
        <p className="text-lg">Дашборд не найден</p>
      </div>
    )
  }

  return (
    <div className="max-w-[960px] mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Input
          value={dashboard.name}
          onChange={(e) => updateDashboard({ name: e.target.value })}
          className="text-xl font-bold border-none shadow-none p-0 h-auto focus-visible:ring-0 max-w-[400px]"
          placeholder="Название дашборда"
        />
        <div className="flex gap-2 ml-auto">
          <Button variant="outline" onClick={save}>Сохранить</Button>
          <Button variant="outline" onClick={share}>Поделиться</Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => { if (v) setActiveTab(v as "data" | "dashboard") }}>
        <TabsList>
          <TabsTrigger value="data">Данные</TabsTrigger>
          <TabsTrigger value="dashboard">Дашборд</TabsTrigger>
        </TabsList>

        {/* Tab: Data */}
        <TabsContent value="data">
          <div className="space-y-4 pt-4">
            {dashboard.metrics.map((metric) => (
              <MetricInput
                key={metric.id}
                metric={metric}
                periods={dashboard.periods}
                onUpdate={updateMetric}
                onRemove={() => removeMetric(metric.id)}
              />
            ))}

            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" onClick={addMetric}>+ Добавить метрику</Button>
              <Button variant="outline" onClick={addPeriod}>+ Добавить период</Button>
            </div>

            <Button
              onClick={analyze}
              disabled={analyzing || !user}
              className="w-full sm:w-auto"
            >
              {analyzing ? "Анализирую..." : "Анализировать"}
            </Button>

            {!user && (
              <p className="text-sm text-muted-foreground">
                Войдите, чтобы запустить анализ
              </p>
            )}
          </div>
        </TabsContent>

        {/* Tab: Dashboard */}
        <TabsContent value="dashboard">
          <div className="pt-4">
            <DashboardView
              metrics={dashboard.metrics}
              periods={dashboard.periods}
              insights={dashboard.insights}
              analyzing={analyzing}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Share Modal */}
      {shareModalId && (
        <ShareModal shareId={shareModalId} onClose={() => setShareModalId(null)} />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/tools/analytics/[id]/page.tsx
git commit -m "feat(analytics): add dashboard editor page with tabs"
```

---

### Task 16: Public share page

**Files:**
- Create: `app/share/[shareId]/page.tsx`

- [ ] **Step 1: Create the public page**

Create `app/share/[shareId]/page.tsx` — this is a **Server Component**:

```tsx
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { notFound } from "next/navigation"
import { DashboardViewWrapper } from "./DashboardViewWrapper"

interface PageProps {
  params: Promise<{ shareId: string }>
}

export default async function SharedDashboardPage({ params }: PageProps) {
  const { shareId } = await params
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  )

  const { data: dashboard } = await supabase
    .from("dashboards")
    .select("*")
    .eq("share_id", shareId)
    .single()

  if (!dashboard) notFound()

  const { periods, metrics, insights } = dashboard.data as {
    periods: { month: number; year: number }[]
    metrics: { id: string; name: string; segmentTag?: string; rows: { label: string; values: number[] }[] }[]
    insights: { metricId: string; text: string }[]
  }

  return (
    <div className="max-w-[960px] mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{dashboard.name}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Создано в ProductHub
        </p>
      </div>

      <DashboardViewWrapper
        metrics={metrics || []}
        periods={periods || []}
        insights={insights || []}
      />
    </div>
  )
}
```

Also create `app/share/[shareId]/DashboardViewWrapper.tsx` (client wrapper needed because DashboardView uses recharts which requires `"use client"`):

```tsx
"use client"

import { DashboardView } from "../../components/DashboardView"
import type { Metric, Period, Insight } from "../../lib/types"

interface Props {
  metrics: Metric[]
  periods: Period[]
  insights: Insight[]
}

export function DashboardViewWrapper({ metrics, periods, insights }: Props) {
  return <DashboardView metrics={metrics} periods={periods} insights={insights} />
}
```

- [ ] **Step 2: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/share/[shareId]/page.tsx app/share/[shareId]/DashboardViewWrapper.tsx
git commit -m "feat(analytics): add public read-only share page"
```

---

### Task 17: Add analytics card to home page

**Files:**
- Modify: `app/page.tsx` (line 4–12, tools array)

- [ ] **Step 1: Add the card**

In `app/page.tsx`, add a new entry to the `tools` array (after the RICE entry):

```typescript
{
  href: "/tools/analytics",
  icon: "📊",
  title: "Аналитика продукта",
  desc: "Дашборд метрик с графиками и AI-выводами",
  ready: true,
},
```

- [ ] **Step 2: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat(analytics): add analytics card to home page"
```

---

## Chunk 5: Integration Tests & Verification

### Task 18: Integration tests

**Files:**
- Create: `app/__tests__/analytics-page.test.tsx`

- [ ] **Step 1: Write integration tests**

Create `app/__tests__/analytics-page.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, cleanup } from "@testing-library/react"
import "@testing-library/jest-dom/vitest"

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/tools/analytics",
}))

// Mock useAuth — define user INSIDE factory to keep reference stable
vi.mock("../hooks/useAuth", () => {
  const mockUser = { id: "test-user-id", email: "test@test.com" }
  return { useAuth: () => ({ user: mockUser, loading: false, logout: vi.fn() }) }
})

// Mock supabase-browser
vi.mock("../lib/supabase-browser", () => ({
  supabaseBrowser: () => ({
    auth: {
      getUser: async () => ({ data: { user: { id: "test-user-id" } }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  }),
}))

const MOCK_DASHBOARDS = [
  {
    id: "dash-1",
    name: "Test Dashboard",
    data: { periods: [{ month: 0, year: 2025 }], metrics: [], insights: [] },
    share_id: null,
    user_id: "test-user-id",
    created_at: "2025-01-01T00:00:00Z",
  },
]

function makeFetchMock() {
  return async (url: string, init?: RequestInit) => {
    const method = init?.method || "GET"
    if (url === "/api/analytics/dashboards" && method === "GET") {
      return new Response(JSON.stringify(MOCK_DASHBOARDS))
    }
    if (url === "/api/analytics/dashboards" && method === "POST") {
      return new Response(JSON.stringify({ id: "new-dash", name: "Новый дашборд" }))
    }
    return new Response(JSON.stringify({ success: true }))
  }
}

beforeEach(() => {
  global.fetch = vi.fn(makeFetchMock()) as unknown as typeof fetch
  localStorage.clear()
  localStorage.setItem("producthub-migrated:test-user-id", "true")
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe("Analytics list page", () => {
  it("renders the page title", async () => {
    const { default: AnalyticsListPage } = await import("../tools/analytics/page")
    render(<AnalyticsListPage />)
    expect(await screen.findByText("Аналитика продукта")).toBeInTheDocument()
  })

  it("renders dashboard list", async () => {
    const { default: AnalyticsListPage } = await import("../tools/analytics/page")
    render(<AnalyticsListPage />)
    expect(await screen.findByText("Test Dashboard")).toBeInTheDocument()
  })

  it("shows create button", async () => {
    const { default: AnalyticsListPage } = await import("../tools/analytics/page")
    render(<AnalyticsListPage />)
    expect(await screen.findByText("+ Новый дашборд")).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests**

```bash
npx vitest run app/__tests__/analytics-page.test.tsx
```

Expected: 3 tests PASS

- [ ] **Step 3: Run full test suite**

```bash
npm test
```

Expected: all tests pass (existing + new analytics tests)

- [ ] **Step 4: Commit**

```bash
git add app/__tests__/analytics-page.test.tsx
git commit -m "test(analytics): add integration tests for analytics list page"
```

---

### Task 19: Full build verification

- [ ] **Step 1: Run build**

```bash
npm run build
```

Expected: build succeeds with no errors

- [ ] **Step 2: Run all tests**

```bash
npm test
```

Expected: all tests green

- [ ] **Step 3: Verify dev server**

```bash
npm run dev &
# Wait for server to start, then verify:
curl -s http://localhost:3000/tools/analytics | head -20
kill %1
```

Expected: HTML response with page content

- [ ] **Step 4: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix(analytics): address build/test issues"
```

---

## Summary

| Chunk | Tasks | What it delivers |
|-------|-------|-----------------|
| 1: Foundation | 1-3 | Types, utils (pickChartType, calcDelta, formatMetricValue) + unit tests |
| 2: API Routes | 4-7 | Supabase table, CRUD, Claude API insights, share generation |
| 3: UI Components | 8-12 | KpiCard, ChartBlock, MetricInput, DashboardView, ShareModal |
| 4: Pages & Hook | 13-17 | useAnalytics hook, list page, editor page, share page, home card |
| 5: Verification | 18-19 | Integration tests, full build, dev server check |

Total: 19 tasks, ~50 steps. Each chunk is independently reviewable.
