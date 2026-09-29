import type { Measurement } from '@/types'
import { MEASUREMENT_META } from './constants'

export interface MetricDelta {
  type: string
  label: string
  unit: string
  current: number | null
  previous: number | null
  baseline: number | null
  delta: number | null
  deltaPrev: number | null
  direction: 'down' | 'up' | 'flat' | null
  /** lower-is-better metrics (weight, BP, HbA1c...) treat down as good */
  improving: boolean | null
  currentAt?: string | null
  previousAt?: string | null
}

const LOWER_IS_BETTER = new Set([
  'weight', 'bmi', 'waist', 'bp_systolic', 'bp_diastolic', 'heart_rate',
  'fasting_glucose', 'postmeal_glucose', 'hba1c', 'ldl', 'triglycerides',
  'total_cholesterol', 'tsh', 'pain_score',
])

export function sortedByDate(list: Measurement[]): Measurement[] {
  return [...list].sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime())
}

export function latestByType(list: Measurement[], type: string): Measurement | null {
  const f = list.filter((m) => m.type === type)
  if (!f.length) return null
  return sortedByDate(f)[f.length - 1]
}

export function previousByType(list: Measurement[], type: string): Measurement | null {
  const f = sortedByDate(list.filter((m) => m.type === type))
  return f.length >= 2 ? f[f.length - 2] : null
}

export function baselineByType(list: Measurement[], type: string): Measurement | null {
  const f = sortedByDate(list.filter((m) => m.type === type))
  return f[0] ?? null
}

export function seriesByType(list: Measurement[], type: string): { date: string; value: number }[] {
  return sortedByDate(list.filter((m) => m.type === type)).map((m) => ({
    date: m.recordedAt,
    value: m.value,
  }))
}

export function deltaFor(list: Measurement[], type: string): MetricDelta {
  const meta = MEASUREMENT_META[type] ?? { label: type, unit: '' }
  const current = latestByType(list, type)
  const previous = previousByType(list, type)
  const baseline = baselineByType(list, type)
  const delta = current && previous ? round1(current.value - previous.value) : null
  const deltaPrev = current && baseline && current.id !== baseline.id ? round1(current.value - baseline.value) : null
  const direction = delta == null ? null : delta < 0 ? 'down' : delta > 0 ? 'up' : 'flat'
  const improving =
    direction == null ? null
    : direction === 'flat' ? null
    : LOWER_IS_BETTER.has(type) ? direction === 'down' : direction === 'up'
  // HDL is higher-is-better
  const improvingFixed = type === 'hdl' && direction ? direction === 'up' : improving
  return {
    type, label: meta.label, unit: meta.unit,
    current: current?.value ?? null, previous: previous?.value ?? null, baseline: baseline?.value ?? null,
    delta, deltaPrev, direction, improving: improvingFixed,
    currentAt: current?.recordedAt ?? null, previousAt: previous?.recordedAt ?? null,
  }
}

export function deltasFor(list: Measurement[], types: string[]): MetricDelta[] {
  return types.map((t) => deltaFor(list, t))
}

export function formatDelta(d: MetricDelta): string {
  if (d.delta == null) return '—'
  const sign = d.delta > 0 ? '+' : ''
  return `${sign}${trimNum(d.delta)} ${d.unit}`.trim()
}

export function calcBMI(weightKg: number, heightCm: number): number | null {
  if (!weightKg || !heightCm) return null
  const m = heightCm / 100
  if (m <= 0) return null
  return Math.round((weightKg / (m * m)) * 10) / 10
}

export function bpText(sys: number | null, dia: number | null): string {
  if (sys == null || dia == null) return '—'
  return `${Math.round(sys)}/${Math.round(dia)}`
}

function round1(n: number): number { return Math.round(n * 10) / 10 }
function trimNum(n: number): string {
  return String(Math.round(n * 100) / 100)
}

/** Progress snapshot: % of tracked metrics improving (explicit, auditable definition). */
export function progressStats(deltas: MetricDelta[]): { improving: number; total: number; pct: number } {
  const withDir = deltas.filter((d) => d.direction && d.direction !== 'flat')
  const improving = withDir.filter((d) => d.improving).length
  const total = withDir.length
  return { improving, total, pct: total ? Math.round((improving / total) * 100) : 0 }
}
