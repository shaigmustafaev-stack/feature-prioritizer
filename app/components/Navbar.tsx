"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../hooks/useAuth";

export function Navbar() {
  const pathname = usePathname();
  const isToolPage = pathname.startsWith("/tools/");
  const { user, loading, logout } = useAuth();

  return (
    <nav className="sticky top-0 z-50 flex h-14 items-center border-b border-border bg-background">
      <div className="mx-auto flex w-full max-w-[860px] items-center justify-between px-5 max-sm:px-4">
        <div className="flex items-center gap-3">
          {isToolPage && (
            <Link href="/" className="inline-flex h-8 items-center rounded-md border border-border px-3 text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
              ← Назад
            </Link>
          )}
          <Link href="/" className="text-base font-bold tracking-tight text-primary no-underline hover:text-primary/80 transition-colors">
            ProductHub
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {/* Плейсхолдер во время загрузки — предотвращает flash */}
          {loading ? (
            <div className="h-8 w-16 rounded-md bg-muted/30 animate-pulse" />
          ) : user ? (
            <>
              <span className="max-w-[160px] truncate text-sm text-muted-foreground max-sm:hidden">
                {user.email}
              </span>
              <button
                onClick={logout}
                className="inline-flex h-8 items-center rounded-md border border-border px-3 text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                Выйти
              </button>
            </>
          ) : (
            <Link
              href={`/login?from=${encodeURIComponent(pathname)}`}
              className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Войти
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
