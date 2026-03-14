# Data Model

## Сущности в Supabase

### Feature (таблица `features`)

```typescript
// app/lib/types.ts
interface Feature {
  id: number;        // autoincrement в Supabase, Date.now() в localStorage
  name: string;
  desc: string;      // в Supabase колонка называется "description"
  reach: number;
  impact: number;    // 0.25 | 0.5 | 1 | 2 | 3
  confidence: number; // 10 | 30 | 50 | 80 | 100
  effort: number;    // > 0, шаг 0.5
  status: Status;    // "new" | "in-progress" | "done" | "deferred"
}
```

**Supabase таблица `features`:** колонки = `id, name, description, reach, impact, confidence, effort, status, user_id, created_at`. Маппинг: `desc` (клиент) ↔ `description` (БД) через `toFeature()` и `featureToApiBody()`.

### Dashboard (таблица `dashboards`)

```typescript
// app/lib/types.ts
interface Dashboard {
  id: string          // UUID
  name: string
  periods: Period[]
  metrics: Metric[]
  insights: Insight[]
  created_at: string
  user_id: string
  share_id?: string   // 16-char random token для публичного доступа
}

interface DashboardRow {
  id: string
  name: string
  data: { periods: Period[]; metrics: Metric[]; insights: Insight[] }  // JSONB
  share_id: string | null
  user_id: string
  created_at: string
}

interface Metric {
  id: string
  name: string
  segmentTag?: string   // "по платформам", "по тарифам"
  rows: MetricRow[]
}

interface MetricRow {
  label: string         // "iOS", "Android" или "" (без разреза)
  values: number[]      // значения по периодам
}

interface Period {
  month: number         // 0-11
  year: number          // 2024
}

type ChartType = "line" | "bar" | "pie" | "horizontal-bar"

interface Insight {
  metricId: string
  text: string          // AI-вывод: факт → гипотеза → рекомендация
}
```

**Supabase таблица `dashboards`:** колонки = `id (UUID), name, data (JSONB), share_id (UNIQUE), user_id, created_at`. Данные (periods, metrics, insights) хранятся в одном JSONB-поле `data`. Нормализация `DashboardRow → Dashboard` через `normalizeDashboardRow()` в `useAnalytics.ts`.

### Планируемые сущности (ещё не в коде)

- **User** — id, email, name, role (сейчас только Supabase Auth, без отдельной таблицы)
- **Project** — id, name, owner_id (мультипроектность — планируется)
- **Feedback** — id, text, category, feature_id, project_id
- **RoadmapColumn** — id, name, order, project_id

## Два режима работы

### Приоритизатор (features)

| | Анонимный (`user === null`) | Авторизованный |
|-|---------------------------|----------------|
| Хранение | `localStorage` ключ `producthub-anon-features` | Supabase через `/api/features` |
| ID генерация | `Date.now() + random` | autoincrement в PostgreSQL |
| Демо-данные | `DEMO_FEATURES` из constants.ts, флаг `producthub-demo-seeded:anon` | нет |

### Аналитика (dashboards)

| | Анонимный (`user === null`) | Авторизованный |
|-|---------------------------|----------------|
| Хранение | **недоступно** — показывает "Войдите" | Supabase через `/api/analytics/dashboards` |
| ID генерация | — | UUID (`gen_random_uuid()`) |
| Шаринг | — | `share_id` — 16-char random token, публичный read-only доступ |

## Миграция localStorage → Supabase

При первом входе авторизованного пользователя (`useFeatures` хук):
1. Читает анонимные фичи из localStorage
2. POST каждой в `/api/features` через `Promise.allSettled`
3. Успешные — удаляет из localStorage. Неудачные — оставляет для ретрая
4. Ставит флаг `producthub-migrated:{user.id}` — больше не мигрирует

> Аналитика не поддерживает анонимный режим — миграция не нужна.

## API Routes

### `/api/features` (приоритизатор)

Один файл `app/api/features/route.ts`, 4 метода:

| Метод | Что делает | Тело запроса |
|-------|-----------|-------------|
| GET | Все фичи пользователя | — |
| POST | Создать фичу | `{ name, description, reach, impact, confidence, effort, status? }` |
| PUT | Обновить фичу | `{ id, ...partial fields }` |
| DELETE | Удалить фичу или все | `{ id }` или `{ clearAll: true }` |

### `/api/analytics/dashboards` (аналитика)

Один файл `app/api/analytics/dashboards/route.ts`, 4 метода:

| Метод | Что делает | Тело запроса |
|-------|-----------|-------------|
| GET | Все дашборды пользователя | — |
| POST | Создать дашборд | `{ name }` |
| PUT | Обновить дашборд | `{ id, name, data: { periods, metrics, insights } }` |
| DELETE | Удалить дашборд | `{ id }` |

### `/api/analytics/generate` (AI-анализ)

| Метод | Что делает | Тело запроса |
|-------|-----------|-------------|
| POST | AI-анализ метрик → insights | `{ dashboardId, metrics, periods }` |

Rate limit: 1 запрос / 30 сек на пользователя (in-memory Map). Приоритет провайдеров: `OPENROUTER_API_KEY` → `GEMINI_API_KEY` → `ANTHROPIC_API_KEY`.

### `/api/analytics/share` (шаринг)

| Метод | Что делает | Тело запроса |
|-------|-----------|-------------|
| POST | Создать/получить share_id | `{ id }` |

**Безопасность (общее):** user_id берётся из `supabase.auth.getUser()`, НЕ из тела запроса. Все запросы фильтруются по `user_id`.

## RLS (Row Level Security)

```sql
-- Features
ALTER TABLE features ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own features" ON features FOR ALL
USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);

-- Dashboards
ALTER TABLE dashboards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own dashboards" ON dashboards FOR ALL
USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Public read by share_id" ON dashboards FOR SELECT
USING (share_id IS NOT NULL);
```

Двойная защита: API route фильтрует по user_id + RLS не даст обойти через Supabase клиент. Публичный доступ к дашбордам — только чтение по `share_id` (16-char random token, unguessable).

## Паттерн для нового инструмента

При добавлении новой сущности (Feedback, RoadmapColumn):
1. Создать таблицу в Supabase с `user_id` + RLS
2. Добавить тип в `app/lib/types.ts`
3. Создать API route по паттерну `/api/features/route.ts` или `/api/analytics/dashboards/route.ts`
4. Создать хук по паттерну `useFeatures.ts` (анонимный + авторизованный) или `useAnalytics.ts` (только авторизованный)
