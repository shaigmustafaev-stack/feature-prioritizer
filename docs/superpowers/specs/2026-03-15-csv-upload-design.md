# CSV Upload — Design Spec

## Goal

Дать юзеру загрузить CSV файл и мгновенно увидеть данные в дашборде — как если бы вбил руками. Без маппинга столбцов, без настроек, без промежуточных экранов.

## Решения

- **Формат:** CSV (любой разделитель — papaparse авто-определяет)
- **Режим:** замена данных дашборда
- **UX:** один клик "Загрузить CSV" → данные появляются в карточках
- **Ошибки:** toast с описанием проблемы
- **Библиотека:** papaparse (авто-определение разделителя, заголовков, типов, BOM)

## Изменение типа Period

**Текущий:**
```typescript
interface Period {
  month: number
  year: number
}
```

**Новый:**
```typescript
interface Period {
  label: string
}
```

Это развязывает руки: период может быть "Ноябрь 2025", "Q1 2024", "2024-W03", просто текст.

### Обратная совместимость

Старые дашборды в Supabase хранят `{ month: number, year: number }`. Миграция при загрузке:

```typescript
function migratePeriod(p: { month?: number; year?: number; label?: string }): Period {
  if (p.label) return { label: p.label }
  // old format: { month: 0, year: 2025 } → "янв. 25"
  return { label: new Date(p.year!, p.month!).toLocaleDateString("ru-RU", { month: "short", year: "2-digit" }) }
}
```

Функция `migratePeriod` выносится в `app/lib/utils.ts` и используется в:
- `useAnalytics.ts` → `normalizeDashboardRow()`
- `app/share/[shareId]/page.tsx` → SSR загрузка публичного дашборда

### Что меняется

- `app/lib/types.ts` — тип Period
- `app/lib/utils.ts` — функция `migratePeriod()`
- `app/components/MetricInput.tsx` — `formatPeriodLabel()` → просто `p.label`
- `app/components/ChartBlock.tsx` — `formatPeriodLabel()` → просто `p.label`
- `app/hooks/useAnalytics.ts` — `addPeriod()` генерирует label, миграция в `normalizeDashboardRow()`
- `app/api/analytics/generate/route.ts` — `periodLabels` берёт из `p.label`
- `app/share/[shareId]/page.tsx` — миграция периодов при SSR

### addPeriod() — дефолтный label

При ручном добавлении периода: текущий месяц/год в формате "мар. 26". Для последующих — инкремент от последнего периода. Если label последнего периода не парсится как дата → "Период N".

## Авто-определение данных CSV

Papaparse парсит файл с `header: true, dynamicTyping: true`. Получаем массив объектов с типизированными значениями.

**Алгоритм (чистая функция `parseCSVToMetrics`):**

1. Классифицировать столбцы по данным (не по заголовку):
   - Все значения `typeof number` → столбец значений (потенциальная метрика)
   - Есть хотя бы одно не-число → столбец подписей (текст)
   - Числовой столбец с ≤ 5 уникальных значений (2025, 2026) → переклассифицируем как текст (это скорее год/категория, не метрика)

2. Определить подписи строк:
   - **Нет текстовых столбцов** → подписи = "1", "2", "3"...
   - **Один текстовый столбец** → его значения = подписи
   - **Несколько текстовых столбцов** → конкатенация через " · " = подпись

3. Группировка и агрегация:
   - Если подписи повторяются → группируем, **суммируем** значения
   - Если все подписи уникальные → каждая строка = отдельная точка данных
   - **Ограничение MVP:** всегда сумма. Для rate/average метрик результат будет некорректным — юзер поправит руками. Документируем как известное ограничение.

4. Маппинг в структуру дашборда:
   - Подписи после группировки = периоды (`Period[]`)
   - Каждый числовой столбец = метрика с одной строкой (название из заголовка)

5. Результат: `{ periods: Period[], metrics: Metric[] }`

**Примеры:**

Файл 1 — `Всего отправлено.csv` (Год, Месяц, День, Сумма hits):
- Год: числовой, но 2 уникальных значения → переклассифицируем как текст
- День: числовой, 31 уникальное значение → остаётся метрикой
- Месяц: текст
- Подписи: "2025 · Ноябрь", "2025 · Декабрь", ... (Год + Месяц)
- Повторяются → группировка + сумма
- Результат: 5 периодов, 2 метрики (День и Сумма hits). День бессмысленный — юзер удалит
- **Примечание:** День будет суммой дней месяца (1+2+3+...+30=465) — очевидно мусор, юзер удалит одним кликом

Файл 2 — `Кол-во упоминаний копилота.csv` (p1, Сумма hits):
- p1 = текст, Сумма hits = число
- 14 уникальных подписей → 14 периодов
- Результат: 14 периодов, 1 метрика

## UI компоненты

### Кнопка загрузки

В панели управления на вкладке "Данные", рядом с "+ Добавить метрику" и "+ Добавить период":

```
[+ Добавить метрику] [+ Добавить период] [📄 Загрузить CSV]
```

Кнопка `variant="outline"`. Скрытый `<input type="file" accept=".csv,.tsv,.txt">`. Клик по кнопке триггерит file input.

### Обработка файла

1. `FileReader.readAsText(file)` (лимит: 5MB, иначе toast)
2. `Papa.parse(text, { header: true, dynamicTyping: true, skipEmptyLines: true })`
3. `parseCSVToMetrics(parsed.data)` → `{ periods, metrics }`
4. Валидация: минимум 1 метрика и 1 период, иначе toast с ошибкой
5. `updateDashboard({ periods, metrics, insights: [] })` — замена данных, сброс инсайтов
6. Toast: "Загружено: N метрик, M периодов"

### Ошибки (toast)

- Файл > 5MB → "Файл слишком большой (максимум 5 МБ)"
- Нет числовых столбцов → "В файле не найдено числовых данных"
- Пустой файл → "Файл пустой"
- Ошибка парсинга → "Не удалось прочитать файл"

## Известные ограничения (MVP)

- **Агрегация только суммой.** Для rate/average метрик результат будет некорректным. Юзер может поправить руками.
- **Кодировка:** поддерживается UTF-8 (с BOM и без). Windows-1251 (частый для русского Excel) не поддерживается — юзеру нужно пересохранить файл как UTF-8.
- **Нет undo.** Загрузка заменяет данные. Если юзер ошибся — вручную или перезагрузить страницу до auto-save (5 сек).

## Файлы

| Файл | Действие |
|------|----------|
| `package.json` | Добавить `papaparse` + `@types/papaparse` |
| `app/lib/types.ts` | Изменить тип `Period` на `{ label: string }` |
| `app/lib/utils.ts` | Добавить `migratePeriod()` |
| `app/lib/csv-parser.ts` | Создать: `parseCSVToMetrics()` — чистая функция парсинга |
| `app/components/CsvUploadButton.tsx` | Создать: кнопка + скрытый file input + обработка |
| `app/components/MetricInput.tsx` | Упростить `formatPeriodLabel()` → `p.label` |
| `app/components/ChartBlock.tsx` | Упростить `formatPeriodLabel()` → `p.label` |
| `app/hooks/useAnalytics.ts` | `addPeriod()` с label, миграция в `normalizeDashboardRow()` |
| `app/api/analytics/generate/route.ts` | `periodLabels` из `p.label` |
| `app/share/[shareId]/page.tsx` | Миграция периодов при SSR |
| `app/tools/analytics/[id]/page.tsx` | Добавить `CsvUploadButton` в панель |
| `app/__tests__/csv-parser.test.ts` | Тесты парсера: оба формата файлов + edge cases |
| `app/__tests__/analytics-utils.test.ts` | Добавить тесты `migratePeriod()` |
