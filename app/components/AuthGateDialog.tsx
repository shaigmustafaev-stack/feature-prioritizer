"use client"

import Link from "next/link"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"

interface AuthGateDialogProps {
  open: boolean
  onClose: () => void
}

export function AuthGateDialog({ open, onClose }: AuthGateDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Войдите для AI-анализа</AlertDialogTitle>
          <AlertDialogDescription>
            Анализ, сохранение и шаринг доступны после входа
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Отмена</AlertDialogCancel>
          <Link href="/login">
            <AlertDialogAction onClick={onClose}>Войти</AlertDialogAction>
          </Link>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
