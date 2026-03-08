# ProductHub

## О проекте
SaaS-сервис с набором AI-инструментов для продакт-менеджеров.

**Текущий MVP:** RICE/ICE приоритизатор фич — помогает команде расставить приоритеты по формулам:
- `RICE = (Охват × Влияние × Уверенность%) ÷ Трудозатраты`
- `ICE = Влияние × Уверенность% × (10 ÷ Трудозатраты)`

**Планируемые инструменты:** генератор гипотез, генератор User Stories, дашборд метрик, составление ТЗ.

## Стек
- **Next.js 16** (App Router, Turbopack), React 19, TypeScript 5
- **CSS Modules** — стили всех компонентов. Tailwind подключён в globals.css только для базовых ресетов, Tailwind-классы в JSX не используем
- **Vitest + Testing Library** — unit и integration-тесты
- **Supabase** — планируется (БД и авторизация)
- **Claude API** — планируется (AI-фичи)
- **Vercel** — деплой, автоматически при `git push` в main

## Команды
```
npm run dev       # запуск локально (http://localhost:3000)
npm test          # запустить unit + integration тесты
npm run build     # проверить TypeScript и сборку
git push          # деплой на Vercel
```

## Перед каждым пушем
Всегда запускать `npm run build` и `npm test` перед коммитом. Если есть ошибки — починить, потом пушить.

## Поддержание актуальности CLAUDE.md
После крупных изменений структуры — обновить этот файл. Держать актуальным дерево файлов и описание структуры.

## Структура проекта
```
app/
  page.tsx                  # главная страница — витрина инструментов (ProductHub)
  page.module.css           # стили главной страницы
  layout.tsx                # общий layout (включает Navbar)
  globals.css               # глобальные стили и ресеты

  tools/
    rice/
      page.tsx              # приоритизатор фич (RICE/ICE)
      page.module.css       # стили приоритизатора

  lib/
    types.ts                # все TypeScript-типы: Feature, Status, ScoringMode, FormState и др.
    constants.ts            # константы: IMPACT_SCALE, CONF_OPTIONS, STATUS_CYCLE, DEMO_FEATURES и др.
    utils.ts                # чистые функции: calcRice, calcIce, getScore, validateFeature, buildCsv

  hooks/
    useFeatures.ts          # управление бэклогом (useState + localStorage)

  components/
    Navbar.tsx / .module.css        # навигационная панель (Client Component, usePathname)
    FeatureCard.tsx / .module.css   # карточка фичи: просмотр + встроенное редактирование
    NumberInput.tsx / .module.css   # числовой инпут с кнопками +/−
    Tooltip.tsx / .module.css       # тултип при наведении

  __tests__/
    utils.test.ts           # unit-тесты для lib/utils.ts
    rice-page.test.tsx      # integration-тесты страницы приоритизатора
```

## Правила кода
- **Язык:** интерфейс, комментарии и коммиты — на русском
- **TypeScript:** строгий, никаких `any`
- **Стили:** CSS Modules — создавать `Name.module.css` рядом с компонентом. Inline `style={{}}` допустим только для динамических значений (цвет из props, ширина из вычислений)
- **Размер файлов:** компоненты больше 50 строк — в `app/components/`
- **Типы** — в `app/lib/types.ts`, **константы** — в `app/lib/constants.ts`, **чистые функции** — в `app/lib/utils.ts`
- **Тесты:** чистую логику покрывать unit-тестами, пользовательские сценарии — integration-тестами в `app/__tests__/`

## Важные детали
- **localStorage:** бэклог хранится под ключом `rice-features`. При загрузке — миграция старых записей (`status ?? "new"`)
- **Статусы фич:** `new → in-progress → done → deferred` (цикличное переключение по клику на бейдж). Объект `STATUSES` в `types.ts` хранит label, color, bg для каждого статуса
- **Мобильный брейкпоинт:** `max-width: 639px` — при адаптивной вёрстке использовать именно его
- **suppressHydrationWarning** на `<html>` в layout.tsx — нужно из-за браузерных расширений (Bybit Wallet и др.), которые инжектят атрибуты в DOM

## Не трогать
- `node_modules/`
- `.next/`
