"use client"

import type { CarePlan } from "@/types"
import { CARE_PLAN_PRESETS } from "@/lib/constants"

/** PRD §44-46 — Care Plan + adherence review + presets. */
export function CarePlanCard({ plan }: { plan: CarePlan }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">{plan.name}</p>
        <span className="rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-semibold text-success">{plan.status}</span>
      </div>
      {plan.nextReview && <p className="text-xs text-muted-foreground">Next review {new Date(plan.nextReview).toLocaleDateString()}</p>}
      <ul className="mt-3 space-y-1.5">
        {plan.items.map((it) => (
          <li key={it.id} className="flex items-start gap-2 text-sm">
            <span aria-hidden>{it.done ? "☑" : "○"}</span>
            <span>
              <span className="font-medium">{it.title}</span>
              <span className="text-muted-foreground"> · {it.category}</span>
              {it.adherence && (
                <span className={`ml-2 rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${adherenceTone(it.adherence)}`}>
                  {it.adherence}
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function CarePlanPresetPicker({ onPick }: { onPick: (items: { category: string; title: string }[]) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {CARE_PLAN_PRESETS.map((p) => (
        <button key={p.name} type="button" onClick={() => onPick(p.items)} className="rounded-full border px-3 py-1 text-xs font-medium hover:bg-accent">
          + {p.name}
        </button>
      ))}
    </div>
  )
}

function adherenceTone(a: string): string {
  if (/good|excellent/i.test(a)) return "bg-success/15 text-success"
  if (/partial|fair/i.test(a)) return "bg-warning/15 text-warning-foreground"
  return "bg-destructive/15 text-destructive"
}
