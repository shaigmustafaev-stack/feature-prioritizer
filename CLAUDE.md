# ProductHub

## О проекте
SaaS-сервис с набором AI-инструментов для продакт-менеджеров.

**Текущий MVP:** RICE/ICE приоритизатор фич — помогает команде расставить приоритеты по формулам:
- `RICE = (Охват × Влияние × Уверенность%) ÷ Трудозатраты`
- `ICE = Влияние × Уверенность% × (10 ÷ Трудозатраты)`

**Планируемые инструменты:** генератор гипотез, генератор User Stories, дашборд метрик, составление ТЗ.

## Стек
- **Next.js 16** (App Router, Turbopack), React 19, TypeScript 5
- **shadcn/ui** (base-ui) — дизайн-система: Button, Input, Select, Card, Tooltip, Badge, Tabs, Separator
- **Tailwind CSS 4** — все стили через utility-классы в JSX. CSS Modules не используем
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

## Деплой и проверка
Рабочий процесс:
1. Внести изменения, запустить `npm run build` и `npm test`
2. Закоммитить локально
3. Сообщить пользователю: "Готово, проверь на localhost:3000"
4. Пушить **только после явного подтверждения** ("заливай", "пушь", "деплой")

Никогда не пушить без явной команды от пользователя.

## Поддержание актуальности CLAUDE.md
После крупных изменений структуры — обновить этот файл. Держать актуальным дерево файлов и описание структуры.

## Структура проекта
```
app/
  page.tsx                  # главная страница — витрина инструментов (ProductHub)
  layout.tsx                # общий layout (Navbar + TooltipProvider)
  globals.css               # глобальные стили, CSS-переменные темы, Tailwind

  tools/
    rice/
      page.tsx              # приоритизатор фич (RICE/ICE)

  lib/
    types.ts                # все TypeScript-типы: Feature, Status, ScoringMode, FormState и др.
    constants.ts            # константы: IMPACT_SCALE, CONF_OPTIONS, STATUS_CYCLE, DEMO_FEATURES и др.
    utils.ts                # чистые функции: calcRice, calcIce, getScore, validateFeature, buildCsv

  hooks/
    useFeatures.ts          # управление бэклогом (useState + localStorage)

  components/
    Navbar.tsx              # навигационная панель (Client Component, usePathname)
    FeatureCard.tsx         # карточка фичи: просмотр + встроенное редактирование
    NumberInput.tsx         # числовой инпут с кнопками +/− (shadcn Button + Input)

  __tests__/
    utils.test.ts           # unit-тесты для lib/utils.ts
    rice-page.test.tsx      # integration-тесты страницы приоритизатора

components/
  ui/                       # shadcn/ui компоненты (button, input, select, card, tooltip, badge, tabs, separator)

lib/
  utils.ts                  # утилита cn() для shadcn (clsx + tailwind-merge)
```

## Правила кода
- **Язык:** интерфейс, комментарии и коммиты — на русском
- **TypeScript:** строгий, никаких `any`
- **Стили:** Tailwind CSS utility-классы в JSX. Inline `style={{}}` допустим только для динамических значений (цвет из props, ширина из вычислений)
- **UI-компоненты:** использовать shadcn/ui (Button, Input, Select, Card, Tooltip, Badge, Tabs). Кастомные компоненты — в `app/components/`
- **shadcn/ui API:** shadcn v4 использует base-ui. Вместо `asChild` используем `render` prop. `onValueChange` в Select возвращает `string | null` — проверять на null
- **Размер файлов:** компоненты больше 50 строк — в `app/components/`
- **Типы** — в `app/lib/types.ts`, **константы** — в `app/lib/constants.ts`, **чистые функции** — в `app/lib/utils.ts`
- **Тесты:** чистую логику покрывать unit-тестами, пользовательские сценарии — integration-тестами в `app/__tests__/`

## Важные детали
- **localStorage:** бэклог хранится под ключом `rice-features`. При загрузке — миграция старых записей (`status ?? "new"`)
- **Статусы фич:** `new → in-progress → done → deferred` (цикличное переключение по клику на бейдж). Объект `STATUSES` в `types.ts` хранит label, color, bg для каждого статуса
- **Мобильный брейкпоинт:** `max-sm:` (640px) — при адаптивной вёрстке использовать именно его
- **suppressHydrationWarning** на `<html>` в layout.tsx — нужно из-за браузерных расширений (Bybit Wallet и др.), которые инжектят атрибуты в DOM
- **Тёмная тема:** по умолчанию через CSS-переменные в globals.css (oklch-цвета). Класс `.dark` не нужен — тема задаётся в `:root`

## Не трогать
- `node_modules/`
- `.next/`
