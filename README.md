# ProductHub

Единый workspace для продакт-команд. Текущий MVP: приоритизатор фич по RICE/ICE.

## Что уже есть
- Главная-витрина инструментов: `/`
- Приоритизатор фич: `/tools/rice`
- Формулы:
  - `RICE = (Reach × Impact × Confidence%) / Effort`
  - `ICE = Impact × Confidence% × (10 / Effort)`
- Локальное хранение бэклога в `localStorage` (`rice-features`)
- Статусы фич: `new → in-progress → done → deferred`
- Экспорт бэклога в CSV

## Технологии
- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS 4 + shadcn/ui
- Vitest + Testing Library
- Playwright (smoke e2e)

## Быстрый старт
```bash
npm install
npm run dev
```

Открыть: `http://localhost:3000`

## Проверки качества
```bash
npm test
npm run build
```

Перед пушем в `main` запускать обе команды.

Опциональная браузерная проверка UI:
```bash
npm run test:e2e
```

Подробнее: [E2E.md](./E2E.md)

## Структура
```text
app/
  page.tsx                 # главная (витрина)
  tools/rice/page.tsx      # приоритизатор
  components/              # UI-компоненты
  hooks/useFeatures.ts     # работа с бэклогом
  lib/                     # типы, константы, чистые функции
  __tests__/               # unit + integration тесты
```

## Roadmap (коротко)
- Добавить БД и авторизацию (Supabase)
- Инструмент генерации фич с AI
- Roadmap-доска и связи между инструментами
- Аналитика и feedback-модуль

Подробный план: [PRD.md](./PRD.md), инженерные правила: [CLAUDE.md](./CLAUDE.md).

## Процесс коммитов
- Правила: [COMMIT_GUIDELINES.md](./COMMIT_GUIDELINES.md)
- Шаблон: [COMMIT_TEMPLATE.md](./COMMIT_TEMPLATE.md)
- История этапов: [CHANGELOG.md](./CHANGELOG.md)
