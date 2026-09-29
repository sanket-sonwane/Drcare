"use client"

import { useMemo } from "react"
import type { Measurement } from "@/types"
import { deltaFor, bpText, latestByType } from "@/lib/measurements"
import { TrendBadge } from "./trend-badge"

/** PRD §16 — Patient Health Snapshot: weight / BP / HbA1c / waist + deltas. */
export function HealthSnapshot({ measurements }: { measurements: Measurement[] }) {
  const weight = useMemo(() => deltaFor(measurements, 'weight'), [measurements])
  const hba1c = useMemo(() => deltaFor(measurements, 'hba1c'), [measurements])
  const waist = useMemo(() => deltaFor(measurements, 'waist'), [measurements])
  const sysDelta = useMemo(() => deltaFor(measurements, 'bp_systolic'), [measurements])
  const sys = latestByType(measurements, 'bp_systolic')
  const dia = latestByType(measurements, 'bp_diastolic')

  const cards = [
    { label: 'Weight', value: weight.current != null ? `${trim(weight.current)} kg` : '—', delta: weight },
    { label: 'BP', value: bpText(sys?.value ?? null, dia?.value ?? null), delta: sysDelta },
    { label: 'HbA1c', value: hba1c.current != null ? `${trim(hba1c.current)}%` : '—', delta: hba1c },
    { label: 'Waist', value: waist.current != null ? `${Math.round(waist.current)} cm` : '—', delta: waist },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Health snapshot">
      {cards.map((c) => (
        <div key={c.label} className="rounded-lg border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{c.label}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">{c.value}</p>
          <div className="mt-1.5"><TrendBadge delta={c.delta} /></div>
        </div>
      ))}
    </div>
  )
}

function trim(n: number): string { return String(Math.round(n * 10) / 10) }
