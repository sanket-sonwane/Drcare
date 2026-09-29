"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Plus, X, Loader2 } from "lucide-react"
import { updateConditionsAction } from "@/lib/client-actions"
import { CONDITION_OPTIONS } from "@/lib/constants"
import type { PatientCondition } from "@/types"

/**
 * PRD §14 — patient header conditions as editable chips. Toggle to tag /
 * untag a condition; persisted via server action (demo store or Prisma).
 */
export function ConditionEditor({ patientId, initial }: { patientId: string; initial: PatientCondition[] }) {
  const [items, setItems] = useState<string[]>(initial.map((c) => c.condition))
  const [draft, setDraft] = useState("")
  const [editing, setEditing] = useState(false)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  const options = [...CONDITION_OPTIONS, ...items.filter((i) => !(CONDITION_OPTIONS as readonly string[]).includes(i))]

  function toggle(condition: string) {
    const next = items.includes(condition) ? items.filter((c) => c !== condition) : [...items, condition]
    setItems(next)
    persist(next)
  }

  function addCustom() {
    const v = draft.trim()
    if (!v) return
    const next = items.includes(v) ? items : [...items, v]
    setItems(next)
    persist(next)
    setDraft("")
  }

  function persist(next: string[]) {
    startTransition(async () => {
      try {
        await updateConditionsAction(patientId, next)
        toast.success("Conditions updated")
        router.refresh()
      } catch {
        toast.error("Could not update conditions")
      }
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {items.map((c) => (
        <span key={c} className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
          {c}
          <button type="button" aria-label={`Remove ${c}`} onClick={() => toggle(c)} disabled={pending} className="text-accent-foreground/60 hover:text-accent-foreground">
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}

      {editing ? (
        <>
          <div className="flex flex-wrap gap-1.5">
            {options.map((o) => {
              const on = items.includes(o)
              return (
                <button key={o} type="button" aria-pressed={on} onClick={() => toggle(o)} disabled={pending}
                  className={`min-h-10 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${on ? 'border-primary bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-accent'}`}>
                  {o}
                </button>
              )
            })}
          </div>
          <span className="inline-flex items-center gap-1">
            <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Custom condition…" aria-label="Add custom condition"
              className="h-7 w-40 rounded-md border border-border bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            <button type="button" onClick={addCustom} className="rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/20">Add</button>
            <button type="button" onClick={() => setEditing(false)} className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent">Done</button>
          </span>
        </>
      ) : (
        <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-1 rounded-full border border-dashed px-2.5 py-0.5 text-xs font-medium text-muted-foreground hover:bg-accent">
          {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />} Edit
        </button>
      )}
    </div>
  )
}