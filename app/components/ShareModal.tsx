"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface ShareModalProps {
  shareId: string | null
  onClose: () => void
}

export function ShareModal({ shareId, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)

  // Focus trap + Esc close
  useEffect(() => {
    if (!shareId) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
        return
      }
      // Simple focus trap
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, [tabindex]:not([tabindex="-1"])'
        )
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    // Focus first element
    setTimeout(() => {
      const firstFocusable = dialogRef.current?.querySelector<HTMLElement>("button, input")
      firstFocusable?.focus()
    }, 0)

    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [shareId, onClose])

  if (!shareId) return null
  const shareUrl = `${window.location.origin}/share/${shareId}`

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Поделиться дашбордом"
    >
      <div
        ref={dialogRef}
        className="bg-card rounded-xl border p-6 w-full max-w-md space-y-4 mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">Поделиться дашбордом</h2>
        <p className="text-sm text-muted-foreground">Любой с этой ссылкой может просматривать дашборд</p>
        <div className="flex gap-2">
          <Input value={shareUrl} readOnly className="text-sm" />
          <Button onClick={handleCopy} className="shrink-0">{copied ? "Скопировано!" : "Копировать"}</Button>
        </div>
        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>Закрыть</Button>
        </div>
      </div>
    </div>
  )
}
