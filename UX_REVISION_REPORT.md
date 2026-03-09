# UX-ревизия приоритизатора фич — Отчёт

## Этап 1: Курсоры и hover-эффекты

### 1.1 Глобальный cursor: pointer
- Добавлен `cursor: pointer` в `globals.css` для: `button`, `[role="combobox"]`, `[role="option"]`, `[role="tab"]`, `[data-slot="select-trigger"]`, `summary`.
- Все кнопки на всех страницах теперь корректно показывают pointer.

### 1.2 Hover-эффекты
- **CTA "Добавить в бэклог"**: исправлен hover в `button.tsx` — `[a]:hover:bg-primary/80` → `hover:bg-primary/80` (ранее hover работал только для ссылок).
- **Карточки фич**: добавлен `hover:bg-muted/50` + `transition-colors`.
- **Фильтры статусов**: добавлен `hover:bg-muted`.
- Кнопки outline/ghost/destructive (Скачать CSV, Очистить, ← Назад, −/+) уже имели hover в shadcn — без изменений.

### 1.3 Active/pressed state
- Глобальный `active:scale(0.97)` через CSS для `button`, `[role="tab"]`, `[data-slot="select-trigger"]`.
- `transition: transform 100ms ease` вынесен в базовое правило для плавности.

---

## Этап 2: UI-компоненты

### 2.1 Формула удалена со страницы
- Убран дублирующий текст формулы RICE/ICE под описанием. Формула доступна в тултипе кнопки RICE/ICE.

### 2.2 Селекты: полный label в триггере
- Добавлены хелперы `getImpactLabel()` и `getConfLabel()` в `utils.ts`.
- `SelectValue` теперь рендерит полный label: `1 — Среднее` вместо `1`, `80% — Уверен` вместо `80`.
- Исправлено в форме создания (`rice/page.tsx`) и в форме редактирования (`FeatureCard.tsx`).

### 2.3 Тултипы "?" — touch-поведение
- Создан компонент `InfoTip` (`app/components/InfoTip.tsx`).
- Работает как toggle: tap открывает, повторный tap или клик вне — закрывает.
- На десктопе hover по-прежнему работает.
- Заменены все 4 инлайновых тултипа в форме.

### 2.4 Звёздочки убраны
- Удалены `*` с полей "Название", "Охват", "Трудозатраты". Все поля обязательны, валидация предотвращает пустую отправку.

---

## Этап 3: Мобильная адаптация

### 3.1 KPI — компактная строка на мобиле
- На `< 640px`: 4 карточки заменены на одну строку `Фич: N · В работе: N · Готово: N · Топ: N`.
- На десктопе карточки остались без изменений.

### 3.2 Уменьшены отступы на мобиле
- Форма: `max-sm:space-y-1.5 max-sm:p-3`.
- Сетка полей: `max-sm:gap-1.5`.
- Влияние/Уверенность остаются в 2 колонки на мобиле (убран `max-sm:grid-cols-1`).

### 3.3 Шрифт лейблов
- Лейблы метрик увеличены с `text-xs` до `text-sm font-medium text-foreground` — чётко выделяются от placeholder.

---

## Этап 4: Визуальная иерархия

### 4.1 Лейблы vs placeholder
- Лейблы формы: `text-sm font-medium text-foreground` — яркие, заметные.
- Placeholder в инпутах: остаётся `text-muted-foreground` — бледнее.
- Необязательное поле "Описание" получило пометку `(необязательно)` в бледном цвете.
- Лейбл "Охват" укорочен до "📊 Охват" (подробности в тултипе).

---

## Этап 5: Самостоятельная ревизия — дополнительные находки

### 5.1 Primary button hover (button.tsx)
- Исходный shadcn шаблон содержал `[a]:hover:bg-primary/80` — hover работал только для ссылочных кнопок. Заменено на `hover:bg-primary/80`.

### 5.2 Кнопка удаления — увеличен tap target
- `size="icon-xs"` (24×24) заменён на `size="icon"` (32×32) — ближе к рекомендованным 44px.

### 5.3 Длинное название фичи — truncate
- Добавлен `truncate` + `min-w-0` на кнопку-название в карточке фичи для предотвращения переполнения layout.

### 5.4 Неиспользуемый импорт Badge
- Убран `import { Badge }` из `rice/page.tsx` (используется только в `FeatureCard.tsx`).

### 5.5 transition на active state
- `transition: transform` вынесен в базовое CSS-правило (а не в `:active`), чтобы анимация работала и при нажатии, и при отпускании.

---

## Затронутые файлы
- `app/globals.css` — глобальные cursor, active states
- `components/ui/button.tsx` — fix hover для primary variant
- `app/tools/rice/page.tsx` — формула, селекты, тултипы, звёздочки, KPI, лейблы, мобильная адаптация
- `app/components/FeatureCard.tsx` — селекты, hover, truncate, tap target
- `app/components/InfoTip.tsx` — новый компонент (touch-тултип)
- `app/lib/utils.ts` — хелперы getImpactLabel, getConfLabel

## Проверка
- `npm run build` — OK
- `npm test` — 32/32 тестов пройдено
