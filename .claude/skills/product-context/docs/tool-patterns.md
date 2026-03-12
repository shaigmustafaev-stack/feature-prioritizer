# Tool Patterns

Эталон: приоритизатор фич (`/tools/rice`). Все новые инструменты строятся по этому паттерну.

## Структура файлов для нового инструмента

```
app/
  tools/{tool-name}/
    page.tsx              # "use client", основная страница
  lib/
    types.ts              # + новые типы
    constants.ts          # + шкалы, опции, демо-данные
    utils.ts              # + чистые функции (расчёты, валидация, экспорт)
  hooks/
    use{Tool}.ts          # хук управления данными (анон + авторизованный)
  components/
    {Tool}Card.tsx         # карточка элемента (просмотр + inline-редактирование)
  api/{tool-entities}/
    route.ts              # CRUD API route
  __tests__/
    {tool}-utils.test.ts  # unit-тесты чистых функций
    {tool}-page.test.tsx  # integration-тесты страницы
```

## Паттерн страницы (page.tsx)

```
"use client"

1. Хуки: useAuth() → useFeatures(user, authLoading)
2. Локальный стейт: mode, form, errors, editId, filters, sorting
3. Обработчики: handleAdd, startEdit, saveEdit, handleClear, handleExport
4. Вычисления: sorted, filtered, counts, preview score
5. JSX структура (сверху вниз):
   - Header + Mode switcher (Tabs)
   - KPI-карточки (десктоп: Card grid, мобиль: компактная строка)
   - Форма ввода (Card с полями)
   - Preview скора (анимированный блок)
   - CTA кнопка
   - Error banner
   - Бэклог: заголовок + toolbar → фильтры по статусу → список карточек
   - Empty/Loading состояния
```

## Паттерн хука (useFeatures.ts)

```typescript
export function use{Tool}(user: AuthUser | null, authLoading: boolean) {
  // Стейт: items[], loaded, error, mutating

  // useEffect: загрузка
  //   if (authLoading) return — ждём auth
  //   if (user === null) → localStorage (анонимный)
  //   if (user) → fetch("/api/{entities}") + миграция localStorage

  // CRUD callbacks (useCallback):
  //   add: анон → localStorage + setState; авторизован → POST + setState
  //   remove: авторизован → optimistic update + DELETE + rollback on error
  //   update: авторизован → optimistic update + PUT + rollback on error
  //   clear: анон → localStorage.removeItem; авторизован → DELETE { clearAll }

  return { items, loaded, error, mutating, add, remove, update, clear };
}
```

**Ключевые паттерны:**
- Optimistic updates для авторизованного режима (setState → fetch → rollback on error)
- `useCallback` с зависимостью от `[user, items]` для CRUD
- Миграция анонимных данных при первом входе (однократно через `useRef`)
- `featureToApiBody()` — маппинг клиентских полей → API полей (desc → description)

## Паттерн API route

```typescript
// app/api/{entities}/route.ts
async function getAuthUser(supabase) {
  const { data: { user } } = await supabase.auth.getUser();
  return user;  // user_id ТОЛЬКО из auth, не из body
}

// GET: select * where user_id = auth.uid()
// POST: validate body → insert with user_id → return mapped entity
// PUT: validate id + partial fields → update where id AND user_id
// DELETE: { id } → delete one; { clearAll } → delete all user's entities
```

## Паттерн тестов

**Unit (utils.test.ts):** тестировать чистые функции — расчёты, валидацию, форматирование, CSV экспорт. Без DOM.

**Integration (page.test.tsx):**
- `// @vitest-environment jsdom` в начале файла
- Mock `useAuth` — определять `mockUser` ВНУТРИ фабрики `vi.mock` (иначе зацикливание)
- Mock `fetch` для API calls
- Тестировать: рендер, добавление, удаление, смена статуса, переключение режимов

## Связи между инструментами

При создании нового инструмента подумай о связях:
- Кнопка "Отправить в приоритизатор" из генератора/фидбека → `addFeature()` в useFeatures
- Кнопка "В roadmap" из приоритизатора → `updateFeature(id, { column_id })` в useRoadmap
- Общая сущность Feature связывает все инструменты через `feature_id`

## Главная страница

`app/page.tsx` — витрина инструментов. Каждый инструмент = карточка-ссылка на `/tools/{name}`. При добавлении нового инструмента — добавить карточку на главную.
