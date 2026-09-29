"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Pill, Beaker, Dumbbell, Scissors, Leaf, Square } from "lucide-react"
import type { Treatment, TreatmentType } from "@/types"
import { updateTreatmentAction } from "@/lib/client-actions"
import { RESPONSE_LABEL, TREATMENT_TYPES } from "@/lib/constants"
import { cn, formatDate } from "@/lib/utils"
import { StatusBadge, variantForStatus, dotForStatus } from "@/components/ui/status-badge"

const TYPE_ICON: Record<TreatmentType, React.ReactNode> = {
  MEDICATION: <Pill className="h-4 w-4" />,
  THERAPY: <Beaker className="h-4 w-4" />,
  EXERCISE: <Dumbbell className="h-4 w-4" />,
  PROCEDURE: <Scissors className="h-4 w-4" />,
  LIFESTYLE: <Leaf className="h-4 w-4" />,
  OTHER: <Square className="h-4 w-4" />,
}

export function TreatmentCard({ treatment }: { treatment: Treatment }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function update(data: { status?: string; response?: string; notes?: string }) {
    startTransition(async () => {
      try {
        await updateTreatmentAction(treatment.id, data)
        toast.success("Treatment updated")
        router.refresh()
      } catch {
        toast.error("Update failed")
      }
    })
  }

  const typeLabel = TREATMENT_TYPES.find((t) => t.value === treatment.type)?.label ?? treatment.type

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-primary">
              {TYPE_ICON[treatment.type]}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{treatment.name}</h3>
                <span className="text-xs text-muted-foreground">{typeLabel}</span>
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">{treatment.instructions ?? "No instructions"}</p>
              {treatment.dosage && <p className="mt-0.5 text-sm text-muted-foreground">Dosage: {treatment.dosage}</p>}
              <p className="mt-1 text-xs text-muted-foreground">Prescribed {formatDate(treatment.createdAt)}</p>
            </div>
          </div>

          <div className="flex flex-col items-start gap-2 sm:items-end">
            <StatusBadge
              status={treatment.status}
              label={treatment.status.toLowerCase()}
              variant={variantForStatus(treatment.status)}
              dotClassName={dotForStatus(treatment.status)}
            />
            <div className="flex items-center gap-2">
              <label className="hidden text-xs text-muted-foreground sm:inline">Response</label>
              <select
                value={treatment.response}
                onChange={(e) => update({ response: e.target.value })}
                disabled={pending}
                className="h-8 rounded-md border border-border bg-background px-2 text-sm disabled:opacity-50"
                aria-label="Update treatment response"
              >
                {(Object.keys(RESPONSE_LABEL) as (keyof typeof RESPONSE_LABEL)[]).map((k) => (
                  <option key={k} value={k} disabled={k === "UNSET"}>
                    {RESPONSE_LABEL[k]}
                  </option>
                ))}
              </select>
              <select
                value={treatment.status}
                onChange={(e) => update({ status: e.target.value })}
                disabled={pending}
                className="h-8 rounded-md border border-border bg-background px-2 text-sm disabled:opacity-50"
                aria-label="Update treatment status"
              >
                <option value="PRESCRIBED">prescribed</option>
                <option value="ONGOING">ongoing</option>
                <option value="COMPLETED">completed</option>
                <option value="DISCONTINUED">discontinued</option>
              </select>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("rounded-lg border bg-card text-card-foreground shadow-sm", className)}>{children}</div>
}
function CardContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("p-5", className)}>{children}</div>
}