"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import s from "./Navbar.module.css";

export function Navbar() {
  const pathname = usePathname();
  const isToolPage = pathname.startsWith("/tools/");

  return (
    <nav className={s.navbar}>
      <div className={s.inner}>
        <div className={s.left}>
          {isToolPage && (
            <Link href="/" className={s.backBtn}>
              ← Назад
            </Link>
          )}
          <Link href="/" className={s.logo}>
            ProductHub
          </Link>
        </div>
        <div className={s.right} />
      </div>
    </nav>
  );
}
