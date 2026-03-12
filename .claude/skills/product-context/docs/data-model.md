# Data Model

## Сущности — что реально существует

### Feature (единственная таблица в Supabase)

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

### Планируемые сущности (ещё не в коде)

- **User** — id, email, name, role (сейчас только Supabase Auth, без отдельной таблицы)
- **Project** — id, name, owner_id (мультипроектность — планируется)
- **Feedback** — id, text, category, feature_id, project_id
- **RoadmapColumn** — id, name, order, project_id

## Два режима работы

| | Анонимный (`user === null`) | Авторизованный |
|-|---------------------------|----------------|
| Хранение | `localStorage` ключ `producthub-anon-features` | Supabase через `/api/features` |
| ID генерация | `Date.now() + random` | autoincrement в PostgreSQL |
| Демо-данные | `DEMO_FEATURES` из constants.ts, флаг `producthub-demo-seeded:anon` | нет |

## Миграция localStorage → Supabase

При первом входе авторизованного пользователя (`useFeatures` хук):
1. Читает анонимные фичи из localStorage
2. POST каждой в `/api/features` через `Promise.allSettled`
3. Успешные — удаляет из localStorage. Неудачные — оставляет для ретрая
4. Ставит флаг `producthub-migrated:{user.id}` — больше не мигрирует

## API Route `/api/features`

Один файл `app/api/features/route.ts`, 4 метода:

| Метод | Что делает | Тело запроса |
|-------|-----------|-------------|
| GET | Все фичи пользователя | — |
| POST | Создать фичу | `{ name, description, reach, impact, confidence, effort, status? }` |
| PUT | Обновить фичу | `{ id, ...partial fields }` |
| DELETE | Удалить фичу или все | `{ id }` или `{ clearAll: true }` |

**Безопасность:** user_id берётся из `supabase.auth.getUser()`, НЕ из тела запроса. Все запросы фильтруются по `user_id` — пользователь видит только свои данные.

## RLS (Row Level Security)

```sql
ALTER TABLE features ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own features" ON features FOR ALL
USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);
```

Двойная защита: API route фильтрует по user_id + RLS не даст обойти через Supabase клиент.

## Паттерн для нового инструмента

При добавлении новой сущности (Feedback, RoadmapColumn):
1. Создать таблицу в Supabase с `user_id` + RLS
2. Добавить тип в `app/lib/types.ts`
3. Создать API route по паттерну `/api/features/route.ts`
4. Создать хук по паттерну `useFeatures.ts` (анонимный + авторизованный режим)
