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

  const prompt = `Ты — продуктовый аналитик. Отвечай на русском.

Для каждой метрики дай вывод в формате:
1. Что происходит (факт с конкретными цифрами из данных)
2. Почему (гипотеза на основе трендов)
3. Что делать (1 конкретная рекомендация для PM)

Не более 3-4 предложений на метрику. Без воды и общих фраз.

Метрики: ${JSON.stringify(metrics)}
Периоды: ${periodLabels}

Верни ответ строго в JSON формате:
[{"metricId": "<id метрики>", "text": "<вывод>"}]
Без markdown, без \`\`\`, только JSON массив.`;

  let claudeResponse: Response;
  try {
    claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      }),
    });
  } catch {
    return NextResponse.json({ error: "Ошибка сети при обращении к Claude API" }, { status: 500 });
  }

  if (!claudeResponse.ok) {
    const errText = await claudeResponse.text().catch(() => "");
    return NextResponse.json(
      { error: `Ошибка Claude API: ${claudeResponse.status} ${errText}` },
      { status: 502 }
    );
  }

  const claudeData = await claudeResponse.json();
  const rawText: string = claudeData?.content?.[0]?.text ?? "";

  let insights: Insight[];
  try {
    insights = JSON.parse(rawText) as Insight[];
  } catch {
    return NextResponse.json(
      { error: "Не удалось разобрать ответ Claude как JSON", raw: rawText },
      { status: 502 }
    );
  }

  // Record successful request timestamp
  rateLimitMap.set(user.id, now);

  return NextResponse.json({ insights });
}
