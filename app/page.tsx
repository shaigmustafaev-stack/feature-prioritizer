import Link from "next/link";
import { Card } from "@/components/ui/card";

const tools = [
  {
    href: "/tools/rice",
    icon: "🎯",
    title: "Приоритизатор фич",
    desc: "Оцени и отсортируй фичи по формулам RICE и ICE. Найди что делать в первую очередь.",
    ready: true,
  },
  {
    href: "/tools/analytics",
    icon: "📊",
    title: "Аналитика продукта",
    desc: "Дашборд метрик с графиками и AI-выводами",
    ready: true,
  },
];

export default function Home() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-56px)] max-w-[860px] flex-col justify-center px-5 pb-10 max-sm:justify-start max-sm:px-4 max-sm:pt-10">
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-4xl font-extrabold tracking-tight text-foreground max-sm:text-3xl">
          ProductHub
        </h1>
        <p className="text-sm text-muted-foreground">
          Добро пожаловать! Выбери инструмент для работы
        </p>
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] justify-items-center gap-4 max-sm:grid-cols-1">
        {tools.map(tool => (
          <Link key={tool.href} href={tool.href} className="w-full no-underline">
            <Card className="group flex min-h-[180px] w-full cursor-pointer items-center gap-5 border-border p-5 transition-all hover:-translate-y-1 hover:border-primary hover:shadow-lg hover:shadow-primary/10 max-sm:min-h-[140px]">
              <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-xl bg-background text-5xl max-sm:h-14 max-sm:w-14 max-sm:text-4xl">
                {tool.icon}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="mb-1.5 text-base font-semibold text-foreground">
                  {tool.title}
                </h2>
                <p className="text-[13px] leading-relaxed text-muted-foreground">
                  {tool.desc}
                </p>
              </div>
              <div className="shrink-0 text-xl text-muted-foreground transition-all group-hover:translate-x-1 group-hover:text-primary">
                →
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <p className="mt-7 text-center text-xs text-muted-foreground/30">
        Больше инструментов — скоро
      </p>
    </div>
  );
}
