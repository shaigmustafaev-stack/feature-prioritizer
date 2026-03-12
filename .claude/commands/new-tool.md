---
description: Scaffold нового инструмента ProductHub — создаёт страницу, хук, API route, компоненты, тесты, обновляет главную
argument-hint: [tool-name] [description]
---

# Создание нового инструмента ProductHub

## Вход
Название инструмента: $ARGUMENTS

## Контекст
Прочитай CLAUDE.md для правил кода и стека.
Если доступен skill product-context — загрузи его (особенно docs/tool-patterns.md и docs/data-model.md).
Изучи эталон: `app/tools/rice/page.tsx`, `hooks/useFeatures.ts`, `api/features/route.ts`.

## Шаги

### 1. Анализ
- Найди описание инструмента в PRD.md
- Если не нашёл — спроси пользователя что должен делать инструмент
- Определи какие сущности нужны и как связаны с Feature

### 2. Типы и константы
- Добавь TypeScript-типы в `app/lib/types.ts` (паттерн: Feature, Status)
- Добавь константы/шкалы/демо-данные в `app/lib/constants.ts`
- Чистые функции (расчёты, валидация, экспорт) в `app/lib/utils.ts`

### 3. API route (если инструмент работает с данными)
- Создай `app/api/{entities}/route.ts` по паттерну `api/features/route.ts`
- GET/POST/PUT/DELETE, user_id из `supabase.auth.getUser()` (НЕ из body)
- Валидация тела запроса, маппинг клиент ↔ БД полей
- Сообщи пользователю SQL для создания таблицы + RLS в Supabase

### 4. Хук
- Создай `app/hooks/use{ToolName}.ts` по образцу `useFeatures.ts`
- Анонимный (localStorage) + авторизованный (Supabase) режим
- Optimistic updates, миграция localStorage → Supabase при первом входе
- Стабильные ссылки: константы внутри хука, useCallback с правильными deps

### 5. Страница
- Создай `app/tools/{tool-name}/page.tsx`, `"use client"`
- Визуальная иерархия: режим + KPI → ввод → данные → бэклог
- shadcn/ui компоненты (Card, Button, Badge, Tabs, Select, Tooltip)
- UX-состояния: loading, empty, error, success, confirm
- Адаптив: `max-sm` (640px), без горизонтального скролла, tap-target >= 44px
- a11y: `button/link` для интерактивов, `label` + `id`, `aria-label`

### 6. Компоненты
- > 50 строк → выноси в `app/components/`
- shadcn v4: `render` prop вместо `asChild`
- `onValueChange` в Select → проверять на null
- Tailwind CSS utility-классы, НЕ CSS Modules

### 7. Связи с другими инструментами
- Если инструмент создаёт фичи → кнопка "Отправить в приоритизатор" (addFeature)
- Если инструмент принимает фичи → импорт из приоритизатора
- Feature — центральная сущность, связывает все инструменты через feature_id

### 8. Главная страница
- Добавь карточку-ссылку на `app/page.tsx` (по образцу карточки приоритизатора)

### 9. Тесты
- Unit: `app/__tests__/{tool-name}-utils.test.ts` — чистые функции
- Integration: `app/__tests__/{tool-name}-page.test.tsx`
  - `// @vitest-environment jsdom` в начале файла
  - Mock useAuth: `const mockUser` ВНУТРИ фабрики `vi.mock`
  - Покрыть: рендер, добавление, удаление, смена состояния

### 10. Проверка
- `npm test` — все тесты зелёные
- `npm run build --webpack` — сборка без ошибок
- Обнови CLAUDE.md если изменилась структура проекта

## Отчёт
Выведи список созданных/изменённых файлов и предложи проверить на localhost:3000.
