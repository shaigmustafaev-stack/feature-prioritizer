import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabase-server";
import type { Metric, Period, Insight } from "../../../lib/types";

async function getAuthUser(supabase: Awaited<ReturnType<typeof supabaseServer>>) {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// In-memory rate limit: userId -> timestamp of last request
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_MS = 30_000;

export async function POST(request: NextRequest) {
  const supabase = await supabaseServer();
  const user = await getAuthUser(supabase);
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  // Rate limit check
  const lastRequest = rateLimitMap.get(user.id);
  const now = Date.now();
  if (lastRequest && now - lastRequest < RATE_LIMIT_MS) {
    const retryAfter = Math.ceil((RATE_LIMIT_MS - (now - lastRequest)) / 1000);
    return NextResponse.json(
      { error: `Подождите ${retryAfter} сек. перед следующим запросом` },
      { status: 429 }
    );
  }

  const body = await request.json();
  const { metrics, periods } = body as { metrics: Metric[]; periods: Period[] };

  if (!Array.isArray(metrics) || metrics.length === 0) {
    return NextResponse.json({ error: "metrics обязателен и не должен быть пустым" }, { status: 400 });
  }
  if (!Array.isArray(periods) || periods.length === 0) {
    return NextResponse.json({ error: "periods обязателен и не должен быть пустым" }, { status: 400 });
  }

  const periodLabels = periods
    .map((p: Period) =>
      new Date(p.year, p.month).toLocaleDateString("ru-RU", { month: "short", year: "2-digit" })
    )
    .join(", ");

  const prompt = `Ты — старший продуктовый аналитик. Отвечай на русском.

## Твоя задача
Анализировать метрики продукта. Ты НЕ знаешь контекст бизнеса (релизы, маркетинг, аварии). Поэтому:
- Делай выводы ТОЛЬКО из цифр
- Не придумывай причины — давай ГИПОТЕЗЫ для проверки
- Сравнивай метрики МЕЖДУ СОБОЙ — ищи корреляции

## Формат ответа — СТРОГО JSON массив:
[{
  "metricId": "<id>",
  "chartType": "line | bar | pie",
  "summary": "<1 строка: главный факт с цифрами и дельтой>",
  "detail": "<подробный анализ 3-5 предложений>",
  "hypotheses": ["<гипотеза от данных>", "<гипотеза от данных>"],
  "action": "<что конкретно проверить или сделать>"
}]

## Правила chartType:
- line: данные по времени (тренд за периоды)
- bar: сравнение сегментов (iOS vs Android, тарифы)
- pie: доли от целого (распределение)

## Правила анализа:
1. ФАКТ: дельты в %, абсолютные изменения, min/max за период
2. СРАВНЕНИЕ: если есть сегменты — кто растёт/падает быстрее
3. КРОСС-МЕТРИКИ: ищи связи между метриками (DAU падает + Retention растёт = ушли случайные, ядро осталось)
4. АНОМАЛИИ: резкие скачки или провалы — выдели отдельно
5. ГИПОТЕЗЫ: 2-3 версии ОТ ДАННЫХ, не generic. Плохо: "возможно сезонность". Хорошо: "Android падает на 5.6% при росте iOS — проблема специфична для Android"
6. ДЕЙСТВИЕ: что PM должен проверить первым делом

Метрики: ${JSON.stringify(metrics)}
Периоды: ${periodLabels}

Без markdown, без \`\`\`, только JSON массив.`;

  // Приоритет: OpenRouter → Gemini → Claude
  const openrouterKey = process.env.OPENROUTER_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  let aiResponse: Response;
  let provider: "openrouter" | "gemini" | "anthropic";
  try {
    if (openrouterKey) {
      provider = "openrouter";
      const model = process.env.OPENROUTER_MODEL || "google/gemini-2.0-flash-exp:free";
      aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openrouterKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          max_tokens: 4096,
        }),
      });
    } else if (geminiKey) {
      provider = "gemini";
      aiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 4096,
            },
          }),
        }
      );
    } else if (anthropicKey) {
      provider = "anthropic";
      aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 4096,
          messages: [{ role: "user", content: prompt }],
        }),
      });
    } else {
      return NextResponse.json(
        { error: "AI API ключ не настроен. Добавьте OPENROUTER_API_KEY, GEMINI_API_KEY или ANTHROPIC_API_KEY в .env.local" },
        { status: 500 }
      );
    }
  } catch {
    return NextResponse.json({ error: "Ошибка сети при обращении к AI API" }, { status: 500 });
  }

  if (!aiResponse.ok) {
    const errText = await aiResponse.text().catch(() => "");
    return NextResponse.json(
      { error: `Ошибка AI API: ${aiResponse.status} ${errText}` },
      { status: 502 }
    );
  }

  const aiData = await aiResponse.json();

  // Извлекаем текст в зависимости от использованного провайдера
  let rawText: string;
  if (provider === "openrouter") {
    rawText = aiData?.choices?.[0]?.message?.content ?? "";
  } else if (provider === "gemini") {
    rawText = aiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  } else {
    rawText = aiData?.content?.[0]?.text ?? "";
  }

  // Иногда AI оборачивает JSON в ```json ... ``` — удаляем
  rawText = rawText.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();

  let insights: Insight[];
  try {
    insights = JSON.parse(rawText) as Insight[];
  } catch {
    return NextResponse.json(
      { error: "Не удалось разобрать ответ AI как JSON", raw: rawText },
      { status: 502 }
    );
  }

  // Record successful request timestamp
  rateLimitMap.set(user.id, now);

  return NextResponse.json({ insights });
}
