import Link from "next/link"

export default function ShareNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="text-6xl mb-4">🔍</div>
      <h1 className="text-2xl font-bold mb-2">Дашборд не найден</h1>
      <p className="text-muted-foreground mb-6">
        Ссылка недействительна или доступ был отозван владельцем.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        ← На главную
      </Link>
    </div>
  )
}
