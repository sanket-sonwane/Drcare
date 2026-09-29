"use client"

import type { Measurement } from "@/types"
import { deltaFor, seriesByType } from "@/lib/measurements"
import { TrendBadge } from "./trend-badge"
import { formatDate } from "@/lib/utils"

const TRACKED = ['weight', 'waist', 'hba1c', 'fasting_glucose', 'ldl', 'triglycerides', 'tsh', 'pain_score'] as const

/** PRD §20-21 — Progress: longitudinal charts + previous-vs-today comparison. */
export function ProgressSection({ measurements }: { measurements: Measurement[] }) {
  const deltas = TRACKED.map((t) => deltaFor(measurements, t)).filter((d) => d.current != null)
  if (!deltas.length) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center">
        <p className="text-sm font-medium">No measurements yet</p>
        <p className="text-xs text-muted-foreground">Record vitals during a follow-up to build the progress story.</p>
      </div>
    )
  }
  return (
    <div className="space-y-4">
      <PreviousVsToday measurements={measurements} />
      <div className="grid gap-3 md:grid-cols-2">
        {deltas.map((d) => (
          <div key={d.type} className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">{d.label}</p>
              <TrendBadge delta={d} />
            </div>
            <Sparkline type={d.type} measurements={measurements} />
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>Now <strong className="text-foreground">{fmtN(d.current)} {d.unit}</strong></span>
              <span>Prev <strong className="text-foreground">{fmtN(d.previous)} {d.unit}</strong></span>
              <span>Base <strong className="text-foreground">{fmtN(d.baseline)} {d.unit}</strong></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function PreviousVsToday({ measurements }: { measurements: Measurement[] }) {
  const rows = (['weight', 'waist', 'hba1c', 'fasting_glucose', 'ldl'] as const).map((t) => deltaFor(measurements, t))
  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-2 font-medium">Metric</th>
            <th className="px-4 py-2 font-medium">Previous</th>
            <th className="px-4 py-2 font-medium">Today</th>
            <th className="px-4 py-2 font-medium">Change</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((d) => (
            <tr key={d.type} className="border-b last:border-0">
              <td className="px-4 py-2 font-medium">{d.label}</td>
              <td className="px-4 py-2 text-muted-foreground">{fmtN(d.previous)} {d.unit} <span className="text-[11px]">· {formatDate(d.previousAt)}</span></td>
              <td className="px-4 py-2 font-semibold">{fmtN(d.current)} {d.unit}</td>
              <td className="px-4 py-2"><TrendBadge delta={d} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Sparkline({ type, measurements }: { type: string; measurements: Measurement[] }) {
  const s = seriesByType(measurements, type)
  if (s.length < 2) return <p className="mt-2 text-xs text-muted-foreground">Need 2+ readings for a trend.</p>
  const vals = s.map((x) => x.value)
  const min = Math.min(...vals), max = Math.max(...vals)
  const span = max - min || 1
  const W = 220, H = 44
  const pts = vals.map((v, i) => {
    const x = (i / (vals.length - 1)) * (W - 8) + 4
    const y = H - 6 - ((v - min) / span) * (H - 12)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 h-11 w-full" role="img" aria-label={`${type} trend`}>
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="2" className="text-primary" strokeLinecap="round" />
      {vals.map((v, i) => {
        const x = (i / (vals.length - 1)) * (W - 8) + 4
        const y = H - 6 - ((v - min) / span) * (H - 12)
        return <circle key={i} cx={x} cy={y} r="2.5" className="fill-primary" />
      })}
    </svg>
  )
}

function fmtN(n: number | null): string {
  if (n == null) return '—'
  return String(Math.round(n * 100) / 100)
}
