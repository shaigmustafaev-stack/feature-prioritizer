"use client";

import { useState, useEffect, useId } from "react";
import { CircleHelp } from "lucide-react";

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
        className="inline-flex h-8 w-8 cursor-pointer items-center justify-center text-muted-foreground/50 transition-colors hover:text-primary active:text-primary sm:h-5 sm:w-5"
        onPointerDown={e => {
          e.preventDefault();
          setOpen(v => !v);
        }}
        onPointerEnter={e => { if (e.pointerType === "mouse") setOpen(true); }}
        onPointerLeave={e => { if (e.pointerType === "mouse") setOpen(false); }}
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
        <CircleHelp size={14} />
      </button>
      {open && (
        <span
          id={tipId}
          role="tooltip"
          className="absolute left-1/2 top-full z-50 mt-1 w-max max-w-[160px] -translate-x-1/2 rounded-md bg-foreground px-3 py-1.5 text-xs text-background shadow-md"
        >
          {text}
        </span>
      )}
    </span>
  );
}
