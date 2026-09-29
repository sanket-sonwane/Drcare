"use client"

import { VISIT_TYPES, visitTypeMeta } from "@/lib/visit-templates"
import { formatMoney } from "@/lib/utils"
import { cn } from "@/lib/utils"

/** PRD §22 — Choose Visit Type. Determines fields + fee. */
export function VisitTypePicker({ value, onChange }: { value: string; onChange: (key: string) => void }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {VISIT_TYPES.map((t) => {
        const active = value === t.key
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            aria-pressed={active}
            className={cn(
              "rounded-lg border p-3 text-left transition-colors",
              active ? "border-primary bg-primary/5 ring-1 ring-primary" : "bg-card hover:bg-accent"
            )}
          >
            <p className="text-sm font-semibold">{t.name}</p>
            <p className="text-xs text-muted-foreground">{t.description}</p>
            <p className="mt-1 text-xs font-medium text-success">{formatMoney(t.fee)}</p>
          </button>
        )
      })}
    </div>
  )
}

export function VisitTypeBadge({ visitKey }: { visitKey?: string | null }) {
  if (!visitKey) return null
  const meta = visitTypeMeta(visitKey)
  return (
    <span className="rounded-full bg-info/15 px-2.5 py-0.5 text-xs font-semibold text-info dark:bg-sky-950/40 dark:text-sky-200">
      {meta.name}
    </span>
  )
}
