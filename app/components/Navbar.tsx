"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Navbar() {
  const pathname = usePathname();
  const isToolPage = pathname.startsWith("/tools/");

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
        <div className="flex items-center" />
      </div>
    </nav>
  );
}
