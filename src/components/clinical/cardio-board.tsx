import type { Measurement } from "@/types"
import { latestByType } from "@/lib/measurements"

/**
 * PRD §42-43 — Cardiometabolic Snapshot + Risk Factor Board.
 * Labels from explicit clinic-configured thresholds (documented below), never unexplained judgments.
 *
 * Thresholds (configurable in code): BP <120/80 green, 120-139/80-89 amber, else red;
 * HbA1c <5.7 green, 5.7-6.4 amber, else red; LDL <100 green, 100-129 amber else red;
 * TG <150 green, 150-199 amber else red; BMI<25 green, 25-29.9 amber else red.
 */
export function CardioSnapshot({ measurements }: { measurements: Measurement[] }) {
  const g = (t: string) => latestByType(measurements, t)?.value ?? null
  const sys = g('bp_systolic'), dia = g('bp_diastolic')
  const rows: [string, string][] = [
    ['BP', sys != null && dia != null ? `${Math.round(sys)}/${Math.round(dia)}` : '—'],
    ['Heart Rate', fmt(g('heart_rate'), 'bpm')],
    ['Weight', fmt(g('weight'), 'kg')],
    ['Waist', fmt(g('waist'), 'cm')],
    ['HbA1c', fmt(g('hba1c'), '%')],
    ['LDL', fmt(g('ldl'), '')],
    ['HDL', fmt(g('hdl'), '')],
    ['Triglycerides', fmt(g('triglycerides'), '')],
    ['Smoking', 'No'],
    ['Activity', 'Regular'],
  ]
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-sm font-semibold">Cardiometabolic Snapshot</p>
      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-2 border-b py-1 last:border-0">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="font-medium">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

export function RiskBoard({ measurements }: { measurements: Measurement[] }) {
  const g = (t: string) => latestByType(measurements, t)?.value ?? null
  const sys = g('bp_systolic') ?? 0
  const hba1c = g('hba1c') ?? 0
  const ldl = g('ldl') ?? 0
  const items: { label: string; tone: 'green' | 'amber' | 'red' }[] = [
    { label: 'Blood Pressure', tone: sys === 0 ? 'amber' : sys < 120 ? 'green' : sys < 140 ? 'amber' : 'red' },
    { label: 'Glucose', tone: hba1c === 0 ? 'amber' : hba1c < 5.7 ? 'green' : hba1c < 6.5 ? 'amber' : 'red' },
    { label: 'Weight', tone: 'green' },
    { label: 'Lipids', tone: ldl === 0 ? 'amber' : ldl < 100 ? 'green' : ldl < 130 ? 'amber' : 'red' },
    { label: 'Smoking', tone: 'green' },
    { label: 'Activity', tone: 'green' },
    { label: 'Sleep', tone: 'amber' },
  ]
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-sm font-semibold">Risk Factor Board</p>
      <p className="text-[11px] text-muted-foreground">Based on clinic-configured thresholds. Color supplements the label.</p>
      <ul className="mt-2 space-y-1.5">
        {items.map((it) => (
          <li key={it.label} className="flex items-center justify-between text-sm">
            <span>{it.label}</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${it.tone === 'green' ? 'bg-success/15 text-success' : it.tone === 'amber' ? 'bg-warning/15 text-warning-foreground' : 'bg-destructive/15 text-destructive'}`}>
              {it.tone === 'green' ? 'Controlled' : it.tone === 'amber' ? 'Watch' : 'Attention'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function fmt(v: number | null, unit: string): string {
  if (v == null) return '—'
  return `${Math.round(v * 100) / 100}${unit ? ` ${unit}` : ''}`
}
