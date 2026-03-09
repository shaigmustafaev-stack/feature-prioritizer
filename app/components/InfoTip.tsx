"use client";

import { useState, useRef, useEffect, useId } from "react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

interface Props {
  text: string;
}

/** Кнопка "?" с тултипом — работает и на hover (десктоп), и на tap (мобиль) */
export function InfoTip({ text }: Props) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tipId = useId();

  useEffect(() => {
    if (!open) return;
    const handler = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest(`[data-infotip="${tipId}"]`)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [open]);

  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger
        ref={triggerRef}
        type="button"
        data-infotip={tipId}
        aria-label="Показать подсказку"
        className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-border text-[11px] text-muted-foreground transition-colors hover:border-primary hover:text-primary md:h-4 md:w-4 md:text-[10px]"
        onClick={() => setOpen(v => !v)}
      >
        ?
      </TooltipTrigger>
      <TooltipContent data-infotip={tipId}>{text}</TooltipContent>
    </Tooltip>
  );
}
