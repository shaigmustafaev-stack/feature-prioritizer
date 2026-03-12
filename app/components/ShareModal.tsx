"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface ShareModalProps {
  shareId: string | null
  onClose: () => void
}

export function ShareModal({ shareId, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false)
  if (!shareId) return null
  const shareUrl = `${window.location.origin}/share/${shareId}`

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-card rounded-xl border p-6 w-full max-w-md space-y-4 mx-4" onClick={(e) => e.stopPropagation()}>
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
