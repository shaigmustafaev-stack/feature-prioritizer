# Product Analytics Dashboard — Design Spec

## Context

PM тратит часы на ручной сбор метрик из BI-инструментов и отдельно просит AI сделать выводы. Нет единого места, где данные + визуализация + продуктовые выводы живут рядом.

**Инструмент «Аналитика продукта»** — пользователь вводит метрики вручную, получает дашборд с графиками и AI-выводами под каждым графиком.

## Problem Statement

1. Данные разбросаны по Google Sheets, Amplitude, Mixpanel
2. Визуализация требует отдельных BI-инструментов (Metabase, Tableau)
3. Выводы делаются вручную или через отдельный AI-запрос
4. Нет единой точки для "ввёл данные → получил дашборд с рекомендациями"

## Success Criteria

- PM может за 5 минут ввести 3-5 метрик и получить дашборд с графиками и AI-выводами
- Дашборд можно сохранить, дополнить позже, удалить
- Дашборд можно расшарить по ссылке (read-only, без авторизации)
- Тип графика выбирается автоматически по правилам (не AI)

---

## Architecture

### User Flow

```
Главная → "Аналитика продукта" → Список дашбордов (Экран 1)
  → "+ Новый дашборд" → Экран 2 (таб "Данные")
  → Ввод метрик → "Анализировать" → Экран 2 (таб "Дашборд")
  → "Поделиться" → Модалка с ссылкой
```

### Data Flow

```
Ввод метрик → [Анализировать] →
  1. Графики рендерятся МГНОВЕННО (детерминированные правила)
  2. AI-запрос к Claude API → spinner → выводы под графиками
  3. Auto-save в Supabase (dashboards таблица, JSONB)
```

### Screens

| # | URL | Описание |
|---|-----|----------|
| 1 | `/tools/analytics` | Список сохранённых дашбордов |
| 2 | `/tools/analytics/[id]` | Дашборд: табы "Данные" / "Дашборд" |
| 3 | `/share/[shareId]` | Публичный read-only дашборд |

---

## Data Model

### TypeScript Types

```typescript
interface Metric {
  id: string
  name: string              // "DAU", "Конверсия"
  segmentTag?: string       // "по платформам", "по тарифам"
  rows: MetricRow[]
}

interface MetricRow {
  label: string             // "iOS", "Android" или "" (без разреза)
  values: number[]          // [340000, 355000, 348000]
}

interface Period {
  month: number             // 0-11
  year: number              // 2024
  label: string             // "Сен 24" (computed)
}

type ChartType = 'line' | 'bar' | 'pie' | 'horizontal-bar'

interface Insight {
  metricId: string
  text: string              // AI-вывод: факт → гипотеза → рекомендация
}

interface Dashboard {
  id: string
  name: string
  periods: Period[]
  metrics: Metric[]
  insights: Insight[]
  created_at: string
  user_id: string
  share_id?: string
}
```

### Supabase Table

```sql
CREATE TABLE dashboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  data JSONB NOT NULL,           -- { periods, metrics, insights }
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

---

## Chart Type Selection (Deterministic Rules)

Тип графика выбирается по правилам, НЕ через AI:

| Условие | Тип графика |
|---------|-------------|
| 1 строка, 3+ периодов | Line Chart |
| 2-5 сегментов, 2+ периодов | Grouped Bar Chart |
| 6+ сегментов, 2+ периодов | Line Chart (bar нечитаем) |
| 1 период, 2-5 сегментов | Pie Chart |
| 1 период, 6+ сегментов | Horizontal Bar (pie нечитаем) |
| Fallback | Bar Chart |

Реализуется как чистая функция `pickChartType(metric: Metric, periodsCount: number): ChartType`.

---

## Components

### Screen 1: Dashboard List (`/tools/analytics`)

- Список: название + кол-во метрик (Badge) + дата + "Открыть" + "Поделиться"
- "+ Новый дашборд" → POST → redirect на `/tools/analytics/[id]`
- Пустое состояние: "Создайте первый дашборд"
- Удаление (иконка корзины)
- Требует авторизацию

### Screen 2: Dashboard (`/tools/analytics/[id]`)

**Шапка:**
- Editable название дашборда
- Кнопки "Сохранить" + "Поделиться"

**Таб "Данные":**
- Глобальные периоды (dropdowns: месяц + год)
- Список MetricInput блоков
- "+ добавить метрику", "+ добавить период"
- "Анализировать" → generate insights → auto-switch на "Дашборд"

**Таб "Дашборд":**
- KPI-карточки (последнее значение + дельта)
- Графики (recharts: Line/Bar/Pie) + AI-вывод под каждым
- Disabled если анализ не запускался

### MetricInput

- Название метрики (Input)
- Dropdown разреза: "нет", "по платформам", "по тарифам", "по зонам", свой вариант
- Таблица: строки = сегменты, столбцы = периоды, ячейки = number input
- "+ Добавить сегмент" (если разрез выбран)
- "Удалить метрику"

### KpiCard

- Название метрики
- Текущее значение (formatMetricValue: 1.5M, 340K)
- Дельта: ▲ зелёный / ▼ красный (процент изменения)

### ChartBlock

- recharts график (тип по правилам)
- AI-вывод: spinner во время загрузки → текст

### ShareModal

- Ссылка `/share/[shareId]`
- Кнопка "Копировать"

### Screen 3: Public Dashboard (`/share/[shareId]`)

- Server Component
- Read-only DashboardView (KPI + графики + выводы)
- Без авторизации
- Баннер "Создано в ProductHub"

---

## API Routes

### POST `/api/analytics/generate`
- Auth check (401 если не авторизован)
- Rate limit: 1 запрос в 30 сек (по user_id)
- Body: `{ metrics: Metric[], periods: Period[] }`
- Вызов Claude API (claude-sonnet-4-6) через REST fetch
- Response: `{ insights: Insight[] }`

### GET/POST/PUT/DELETE `/api/analytics/dashboards`
- Auth check
- GET: список дашбордов пользователя
- POST: создать новый (пустой) дашборд
- PUT: обновить (name, data) — `id` передаётся в body (`{ id, ... }`)
- DELETE: удалить — `id` передаётся в body (`{ id }`)

> Один route file, id в body (не query param) — консистентно с существующим `/api/features/route.ts`

### POST `/api/analytics/share`
- Auth check
- Генерирует `share_id` (nanoid)
- Сохраняет в dashboards
- Response: `{ shareUrl: string }`

---

## Claude API Prompt

```
Ты — продуктовый аналитик. Отвечай на русском.

Для каждой метрики дай вывод в формате:
1. Что происходит (факт с конкретными цифрами из данных)
2. Почему (гипотеза на основе трендов)
3. Что делать (1 конкретная рекомендация для PM)

Не более 3-4 предложений на метрику. Без воды и общих фраз.

Метрики: ${JSON.stringify(metrics)}
Периоды: ${periods.map(p => p.label).join(', ')}
```

---

## Key Decisions

| Решение | Выбор | Почему |
|---------|-------|--------|
| Тип графика | Детерминированные правила | AI ненадёжен для визуальных решений, правила предсказуемы |
| AI SDK | REST fetch | Одна зависимость меньше (`@anthropic-ai/sdk` не нужен) |
| Хранение | JSONB в одной таблице | Гибко, не нужно 5 таблиц с JOIN |
| Стриминг AI | Нет (spinner → полный текст) | Проще, меньше edge cases |
| Auto-save | Debounced (5 сек) | Защита от потери данных при закрытии вкладки |
| Лимит сегментов для Pie | ≤ 5 | Pie chart нечитаем при 6+ сегментах |
| Лимит сегментов для Grouped Bar | ≤ 5 | Столбцы сливаются при 6+ |

---

## Auth & Permissions

| Действие | Анонимный | Авторизованный |
|----------|-----------|----------------|
| Просмотр share-ссылки | Yes | Yes |
| Ввод метрик (без сохранения) | Yes | Yes |
| Анализировать (Claude API) | No | Yes |
| Сохранение дашборда | No | Yes |
| Список дашбордов | No | Yes |
| Шаринг | No | Yes |

---

## Dependencies

```bash
npm install recharts
```

Существующие зависимости, которые переиспользуем:
- `@supabase/supabase-js` — работа с Supabase
- `shadcn/ui` (Tabs, Input, Button, Badge, Dialog) — UI компоненты
- `next/navigation` — роутинг

---

## Utilities (app/lib/utils.ts)

```typescript
// Выбор типа графика
pickChartType(metric: Metric, periodsCount: number): ChartType

// Дельта между последним и предпоследним значением
calcDelta(values: number[]): { value: number, percent: number }

// Форматирование: 1500000 → "1.5M", 340000 → "340K"
formatMetricValue(value: number): string
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `app/tools/analytics/page.tsx` | Dashboard list (Screen 1) |
| `app/tools/analytics/[id]/page.tsx` | Dashboard with tabs (Screen 2) |
| `app/hooks/useAnalytics.ts` | State management, CRUD, API calls |
| `app/components/MetricInput.tsx` | Metric input block |
| `app/components/DashboardView.tsx` | Dashboard tab: KPIs + charts + insights |
| `app/components/ChartBlock.tsx` | Single chart + AI insight |
| `app/components/KpiCard.tsx` | KPI card with delta |
| `app/components/ShareModal.tsx` | Share link modal |
| `app/api/analytics/generate/route.ts` | Claude API call |
| `app/api/analytics/dashboards/route.ts` | CRUD dashboards |
| `app/api/analytics/share/route.ts` | Generate share link |
| `app/share/[shareId]/page.tsx` | Public read-only dashboard |
| `app/__tests__/analytics.test.tsx` | Tests |

## Files to Modify

| File | Change |
|------|--------|
| `app/lib/types.ts` | Add Metric, MetricRow, Dashboard, Insight, ChartType, Period |
| `app/page.tsx` | Add "Аналитика продукта" card to tools grid |
| `app/lib/utils.ts` | Add pickChartType, calcDelta, formatMetricValue |

---

## Testing Strategy

**Unit tests:**
- `pickChartType()` — все правила (line, bar, pie, horizontal bar, fallback)
- `calcDelta()` — рост, падение, нулевой base
- `formatMetricValue()` — K, M, обычные числа

**Component tests:**
- MetricInput рендерится с правильным количеством inputs
- KpiCard показывает дельту с правильным цветом
- DashboardView рендерит правильное количество ChartBlock

**Verification:**
- `npm test` — все тесты зелёные
- `npm run build` — компилируется без ошибок (на CI/Vercel работает штатно; локально может потребоваться `--webpack` из-за Turbopack бага с кириллическим путём)
