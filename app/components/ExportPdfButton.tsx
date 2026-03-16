"use client"

import { useState, type RefObject } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

interface ExportPdfButtonProps {
  dashboardRef: RefObject<HTMLDivElement | null>
  fileName: string
}

export function ExportPdfButton({ dashboardRef, fileName }: ExportPdfButtonProps) {
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    const el = dashboardRef.current
    if (!el) return

    setExporting(true)
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas-pro"),
        import("jspdf"),
      ])

      let computedBg = getComputedStyle(el).backgroundColor
      if (!computedBg || computedBg === "transparent" || computedBg === "rgba(0, 0, 0, 0)") {
        computedBg = "#ffffff"
      }

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: computedBg,
      })

      const imgData = canvas.toDataURL("image/png")
      const imgWidth = 210 // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      const pdf = new jsPDF({
        orientation: imgHeight > imgWidth ? "portrait" : "landscape",
        unit: "mm",
        format: "a4",
      })

      const pageHeight = pdf.internal.pageSize.getHeight()
      let position = 0

      // Multi-page support
      while (position < imgHeight) {
        if (position > 0) pdf.addPage()
        pdf.addImage(imgData, "PNG", 0, -position, imgWidth, imgHeight)
        position += pageHeight
      }

      pdf.save(`${fileName}.pdf`)
      toast.success("PDF экспортирован")
    } catch {
      toast.error("Ошибка экспорта PDF")
    } finally {
      setExporting(false)
    }
  }

  return (
    <Button variant="outline" onClick={handleExport} disabled={exporting} className="min-h-11">
      {exporting ? "Экспорт..." : "📥 PDF"}
    </Button>
  )
}
