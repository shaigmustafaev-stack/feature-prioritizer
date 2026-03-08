import Link from "next/link";
import s from "./page.module.css";

const tools = [
  {
    href: "/tools/rice",
    icon: "🎯",
    title: "Приоритизатор фич",
    desc: "Оцени и отсортируй фичи по формулам RICE и ICE. Найди что делать в первую очередь.",
    ready: true,
  },
];

export default function Home() {
  return (
    <div className={s.container}>
      <div className={s.hero}>
        <h1 className={s.title}>ProductHub</h1>
        <p className={s.subtitle}>Инструменты для продакт-менеджеров</p>
      </div>

      <div className={s.grid}>
        {tools.map(tool => (
          <Link key={tool.href} href={tool.href} className={s.card}>
            <div className={s.cardIcon}>{tool.icon}</div>
            <div className={s.cardBody}>
              <h2 className={s.cardTitle}>{tool.title}</h2>
              <p className={s.cardDesc}>{tool.desc}</p>
            </div>
            <div className={s.cardArrow}>→</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
