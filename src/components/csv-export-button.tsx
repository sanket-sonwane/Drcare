"use client"

import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"

/** Client-side CSV download (no server route needed). */
export function CsvExportButton({
  filename,
  headers,
  rows,
  label = "Export CSV",
}: {
  filename: string
  headers: string[]
  rows: (string | number)[][]
  label?: string
}) {
  function download() {
    const esc = (v: string | number) => {
      const s = String(v ?? '')
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const csv = [headers, ...rows].map((r) => r.map(esc).join(',')).join('\n')
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Button type="button" size="sm" variant="outline" onClick={download}>
      <Download className="h-4 w-4" /> {label}
    </Button>
  )
}