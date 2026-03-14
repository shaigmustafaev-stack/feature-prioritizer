# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# ProductHub

## О проекте
SaaS-сервис с набором AI-инструментов для продакт-менеджеров.

**Инструменты:**
- **RICE/ICE приоритизатор фич** (`/tools/rice`) — расставляет приоритеты по формулам RICE и ICE
- **Аналитика продукта** (`/tools/analytics`) — дашборды метрик с графиками и AI-выводами через OpenRouter

**Планируемые:** генератор гипотез, генератор User Stories, составление ТЗ.

## Стек
- **Next.js 16** (App Router, Turbopack), React 19, TypeScript 5
- **shadcn/ui** (base-ui) — дизайн-система
- **Tailwind CSS 4** — все стили через utility-классы в JSX. CSS Modules не используем
- **Vitest + Testing Library** — unit и integration-тесты
- **Supabase** — PostgreSQL БД + Supabase Auth (email+пароль, Google OAuth); `@supabase/ssr` для SSR
- **OpenRouter API** — AI-анализ метрик (бесплатная модель, OpenAI-совместимый формат)
- **recharts** — визуализация метрик (Line, Bar, Pie, Horizontal Bar)
- **Vercel** — деплой, автоматически при `git push` в main

## Команды
```
npm run dev           # запуск локально (http://localhost:3000)
npm test              # запустить unit + integration тесты (vitest run)
npm run test:watch    # тесты в watch-режиме
npm run build         # проверить TypeScript и сборку
npm run test:e2e      # опционально: smoke e2e (Playwright, desktop + mobile)
git push              # деплой на Vercel
```

Запустить один тест-файл:
```
npx vitest run app/__tests__/rice-page.test.tsx
```
`npm run test:e2e` не обязателен для каждого мелкого коммита; запускать перед крупными UI-изменениями или по запросу.

**Известная проблема:** Turbopack крашится на кириллических путях. Если `npm run dev` падает — запускать без Turbopack: `npx next dev --no-turbopack`. На Vercel (build) эта проблема не влияет.

## Деплой и проверка
Рабочий процесс:
1. Внести изменения, запустить `npm run build` и `npm test`
2. Закоммитить локально
3. Сообщить пользователю: "Готово, проверь на localhost:3000"
4. Пушить **только после явного подтверждения** ("заливай", "пушь", "деплой")

Никогда не пушить без явной команды от пользователя.

## UX Quality Gate (обязательно для UI-задач)
- Никогда не писать "всё проверено", если выполнены только автотесты.
- В отчёте всегда явно разделять:
  - `Автотесты` (`npm test`, `npm run build`, `npm run test:e2e`)
  - `Ручной UX-аудит` (что проверено руками и на каких viewport)
- Для мобильных UI-изменений обязательные viewport: `375x812`, `390x844`, `768x1024`.
- Обязательный mobile-чеклист: нет горизонтального скролла, tap-target >= 44x44, читабельность, рабочие tap-интеракции (`?`, кнопки, селекты), отсутствие layout-shift в ключевом флоу.
- Если агент не может физически проверить интеракцию (или нет доступа к браузеру), он обязан явно написать это и дать короткий список шагов для ручной проверки пользователем.

## Поддержание актуальности CLAUDE.md
После крупных изменений структуры — обновить этот файл. Держать актуальным дерево файлов и описание структуры.

## Архитектура

### Общая структура
```
app/
  page.tsx                      # главная — витрина инструментов (ProductHub)
  layout.tsx                    # общий layout (Navbar + TooltipProvider)
  globals.css                   # CSS-переменные темы, Tailwind

  tools/
    rice/page.tsx               # приоритизатор фич (RICE/ICE)
    analytics/
      page.tsx                  # список дашбордов (CRUD)
      [id]/page.tsx             # редактор дашборда (метрики, периоды, AI-анализ)

  share/[shareId]/
    page.tsx                    # публичная read-only страница дашборда (SSR)
    DashboardViewWrapper.tsx    # клиентская обёртка для recharts

  api/
    features/route.ts           # CRUD для фич приоритизатора
    analytics/
      dashboards/route.ts       # GET/POST/PUT/DELETE дашбордов
      generate/route.ts         # POST AI-анализ (OpenRouter → Gemini → Claude fallback)
      share/route.ts            # POST генерация share-ссылки

  lib/
    types.ts                    # все TypeScript-типы
    constants.ts                # константы
    utils.ts                    # чистые функции (calcRice, calcIce, pickChartType, formatMetricValue)
    supabase-browser.ts         # Supabase клиент (браузер)
    supabase-server.ts          # Supabase клиент (сервер + cookies)

  hooks/
    useAuth.ts                  # авторизация: user, loading, logout()
    useFeatures.ts              # бэклог: local/cloud режим
    useAnalytics.ts             # дашборд: state, auto-save, analyze, share

  components/
    Navbar.tsx                  # навигация
    FeatureCard.tsx             # карточка фичи (RICE)
    NumberInput.tsx             # числовой инпут +/−
    ChartBlock.tsx              # график метрики (line/bar/pie/horizontal-bar)
    KpiCard.tsx                 # KPI карточка с дельтой
    MetricInput.tsx             # форма ввода метрики + данных по периодам
    DashboardView.tsx           # контейнер: KpiCard[] + ChartBlock[]
    ShareModal.tsx              # модалка шаринга (role="dialog", focus trap, Esc)

  __tests__/
    utils.test.ts               # unit-тесты utils
    rice-page.test.tsx           # integration-тесты приоритизатора
    analytics-utils.test.ts      # unit-тесты pickChartType, formatMetricValue
    analytics-page.test.tsx      # integration-тесты списка дашбордов

components/ui/                   # shadcn/ui компоненты
lib/utils.ts                     # cn() для shadcn (clsx + tailwind-merge)

supabase/migrations/             # SQL-миграции (dashboards table, RLS policies)
```

### Аналитика: потоки данных
1. **Редактор** (`useAnalytics` hook): загрузка → редактирование метрик/периодов → auto-save (дебаунс 5 сек) → PUT `/api/analytics/dashboards`
2. **AI-анализ**: POST `/api/analytics/generate` → OpenRouter API (`openrouter/free` модель) → JSON с insights → сохранение + переключение на таб "Дашборд"
3. **Шаринг**: POST `/api/analytics/share` → генерация `share_id` (16 символов) → `/share/[shareId]` (SSR, read-only, без авторизации)
4. **API routes**: все PUT/DELETE принимают `id` в body (не в URL), т.к. Next.js App Router route handler = один файл `route.ts`

### AI API (generate route)
Приоритет провайдеров: `OPENROUTER_API_KEY` → `GEMINI_API_KEY` → `ANTHROPIC_API_KEY`. Rate limit: 1 запрос / 30 сек на пользователя (in-memory Map). Timeout на клиенте: 30 сек через AbortController.

## Правила кода
- **Язык:** интерфейс и комментарии — на русском; коммиты — формат `type(scope): описание`, тип английский (`feat`/`fix`/`test`/`docs`/`refactor`/`chore`), описание русский
- **TypeScript:** строгий, никаких `any`
- **Стили:** Tailwind CSS utility-классы в JSX. Inline `style={{}}` допустим только для динамических значений
- **UI-компоненты:** использовать shadcn/ui. Кастомные компоненты — в `app/components/`
- **shadcn/ui API:** shadcn v4 использует base-ui. Вместо `asChild` используем `render` prop. `onValueChange` в Select возвращает `string | null` — проверять на null
- **Размер файлов:** компоненты больше 50 строк — в `app/components/`
- **Типы** — в `app/lib/types.ts`, **константы** — в `app/lib/constants.ts`, **чистые функции** — в `app/lib/utils.ts`
- **Тесты:** чистую логику покрывать unit-тестами, пользовательские сценарии — integration-тестами в `app/__tests__/`

## Дизайн-система (правила)
- **Цель интерфейса:** Product cockpit для PM — high signal / low noise, ключевые решения за 1 экран.
- **Источник UI:** по умолчанию `components/ui/*` (shadcn/base-ui), не создавать дубли.
- **Семантика:** Button (primary/outline/ghost), Card (смысловые блоки), Badge (статусы), Tabs (режимы), Tooltip (пояснения метрик).
- **Токены темы:** CSS-переменные из `app/globals.css`, не хардкодить цвета.
- **Состояния UX:** для ключевых экранов обязателен набор `loading / empty / error / success / confirm`.
- **A11y минимум:** `button/link` для интерактивов, `label` ↔ `id`, `aria-label` для иконок, видимый `focus-visible`.
- **Адаптив:** брейкпоинт `max-sm` (640px), без горизонтального скролла.

## Скиллы проекта (`.claude/commands/`)
- `/qa` — quality gate перед коммитом: build → test → code review → UX аудит → отчёт
- `/ship` — полный workflow: qa → commit → push (только после явного "заливай")

## Тесты (Vitest)
- `vitest.config.ts` использует `environment: "node"` — для интеграционных тестов с jsdom нужно добавлять в файл `// @vitest-environment jsdom` или менять конфиг.
- При мокировании `useAuth` в `vi.mock`: определяй `const mockUser = {...}` внутри фабрики, не снаружи — иначе `useFeatures([user])` зациклится из-за нестабильной ссылки.

## Авторизация (Supabase Auth)
- **Пакет:** `@supabase/ssr` — два клиента: `supabase-browser.ts` (браузер) и `supabase-server.ts` (сервер + cookies).
- **proxy.ts** (корень проекта) — Next.js 16: файл называется `proxy.ts`, функция `proxy`. Обновляет JWT при каждом запросе.
- **Анонимный режим:** user === null → данные только в localStorage (ключи: `producthub-anon-features`, `producthub-demo-seeded:anon`).
- **Авторизованный режим:** данные в Supabase. user_id берётся из `supabase.auth.getUser()`, не из body запроса.
- **Миграция:** при первом входе анонимные данные переносятся в Supabase, затем localStorage чистится. Флаг: `producthub-migrated`.
- **RLS:** таблицы `features` и `dashboards` — `auth.uid()::text = user_id`. Дашборды с `share_id IS NOT NULL` доступны для публичного чтения.
- **Google OAuth:** Supabase → Auth → Providers → Google. Redirect URI: `https://<project>.supabase.co/auth/v1/callback`.

## Важные детали
- **Статусы фич:** `new → in-progress → done → deferred` (цикличное переключение по клику на бейдж)
- **Мобильный брейкпоинт:** `max-sm:` (640px)
- **suppressHydrationWarning** на `<html>` в layout.tsx — из-за браузерных расширений
- **Тёмная тема:** по умолчанию через CSS-переменные в globals.css (oklch-цвета). Класс `.dark` не нужен

## Не трогать
- `node_modules/`
- `.next/`
