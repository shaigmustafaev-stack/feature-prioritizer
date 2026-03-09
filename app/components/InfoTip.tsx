"use client";

import { useState, useEffect, useId } from "react";

interface Props {
  text: string;
}

/** Кнопка "?" с тултипом — работает и на hover (десктоп), и на tap (мобиль) */
export function InfoTip({ text }: Props) {
  const [open, setOpen] = useState(false);
  const tipId = useId();

  useEffect(() => {
    if (!open) return;
    const handler = (e: PointerEvent) => {
      let current = e.target as HTMLElement | null;
      let insideTip = false;

      while (current) {
        if (current.dataset?.infotip === tipId) {
          insideTip = true;
          break;
        }
        current = current.parentElement;
      }

      if (!insideTip) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [open]);

  return (
    <span className="relative inline-flex" data-infotip={tipId}>
      <button
        type="button"
        aria-label="Показать подсказку"
        aria-expanded={open}
        aria-describedby={open ? tipId : undefined}
        className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-border text-[11px] text-muted-foreground transition-colors hover:border-primary hover:text-primary md:h-6 md:w-6 md:text-[11px]"
        onClick={e => {
          e.preventDefault();
          setOpen(v => !v);
        }}
        onKeyDown={e => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen(v => !v);
          }
          if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      >
        ?
      </button>
      {open && (
        <span
          id={tipId}
          role="tooltip"
          className="absolute left-1/2 top-full z-50 mt-1 w-max max-w-[260px] -translate-x-1/2 rounded-md bg-foreground px-3 py-1.5 text-xs text-background shadow-md"
        >
          {text}
        </span>
      )}
    </span>
  );
}
