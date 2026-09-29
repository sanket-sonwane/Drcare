import { cn } from "@/lib/utils"
import type { MetricDelta } from "@/lib/measurements"
import { formatDelta } from "@/lib/measurements"

/** Trend badge: ↓ green when improving, ↑ red when worsening. Text + color (never color alone). */
export function TrendBadge({ delta, showValue = true }: { delta: MetricDelta; showValue?: boolean }) {
  if (delta.current == null) return <span className="text-xs text-muted-foreground">—</span>
  const arrow = delta.direction === 'down' ? '↓' : delta.direction === 'up' ? '↑' : '→'
  const tone =
    delta.improving == null || delta.direction === 'flat'
      ? "bg-muted text-muted-foreground"
      : delta.improving
        ? "bg-success/15 text-success dark:bg-emerald-950/40 dark:text-emerald-300"
        : "bg-destructive/15 text-destructive dark:bg-red-950/40 dark:text-red-300"
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", tone)}>
      <span aria-hidden>{arrow}</span>
      {showValue && delta.delta != null && delta.direction !== 'flat' ? formatDelta(delta) : delta.direction === 'flat' ? 'stable' : arrow}
    </span>
  )
}

export function MetricCard({ delta, suffix, onClick }: { delta: MetricDelta; suffix?: string; onClick?: () => void }) {
  const main =
    delta.type === 'bp_systolic'
      ? null
      : delta.current == null
        ? '—'
        : `${trim(delta.current)}${delta.unit ? ` ${delta.unit}` : ''}${suffix ?? ''}`
  if (main == null) return null
  const inner = (
    <>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{delta.label}</p>
      <p className="mt-1 text-xl font-semibold tracking-tight">{main}</p>
      <div className="mt-1"><TrendBadge delta={delta} /></div>
    </>
  )
  if (!onClick) return <div className="rounded-lg border bg-card p-3">{inner}</div>
  return <button type="button" onClick={onClick} className="rounded-lg border bg-card p-3 text-left transition-colors hover:bg-accent">{inner}</button>
}

function trim(n: number): string {
  return String(Math.round(n * 100) / 100)
}
