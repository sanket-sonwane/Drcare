"use client"

import { startTransition, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Check } from "lucide-react"
import { markFollowUpAction } from "@/lib/client-actions"
import { formatDate } from "@/lib/utils"
import { isOverdue } from "@/lib/timeline"
import { FOLLOWUP_STATUS_LABEL } from "@/lib/constants"
import { StatusBadge, variantForStatus, dotForStatus } from "@/components/ui/status-badge"
import { Button } from "@/components/ui/button"

export function FollowUpList({
  items,
}: {
  items: {
    id: string
    patientId: string
    patientName: string
    patientCode?: string
    scheduledDate: string
    reason?: string | null
    status: string
  }[]
}) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)

  function complete(id: string) {
    setBusyId(id)
    startTransition(async () => {
      try {
        await markFollowUpAction(id, "COMPLETED")
        toast.success("Follow-up marked complete")
        router.refresh()
      } catch {
        toast.error("Update failed")
      } finally {
        setBusyId(null)
      }
    })
  }

  if (items.length === 0) {
    return <p className="py-4 text-center text-sm text-muted-foreground">No upcoming or overdue follow-ups.</p>
  }

  return (
    <div className="divide-y">
      {items.map((f) => {
        const overdue = isOverdue(f.scheduledDate)
        return (
          <div key={f.id} className={`flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between ${overdue ? "sm:pl-2" : ""}`}>
            <div className="flex items-center gap-3">
              {overdue && <span className="hidden h-2 w-2 rounded-full bg-destructive sm:inline-block" aria-hidden />}
              <div className="min-w-0">
                <Link href={`/patients/${f.patientId}`} className="font-medium hover:underline">
                  {f.patientName}
                </Link>
                {f.patientCode && <span className="ml-1 text-xs text-muted-foreground">{f.patientCode}</span>}
                <p className="text-xs text-muted-foreground">
                  {formatDate(f.scheduledDate, "EEEE, d MMM")} · {f.reason ?? FOLLOWUP_STATUS_LABEL[f.status as keyof typeof FOLLOWUP_STATUS_LABEL]}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge
                status={f.status}
                label={FOLLOWUP_STATUS_LABEL[f.status as keyof typeof FOLLOWUP_STATUS_LABEL]}
                variant={variantForStatus(f.status)}
                dotClassName={dotForStatus(f.status)}
              />
              <Button size="sm" variant="outline" disabled={busyId === f.id} onClick={() => complete(f.id)}>
                <Check className="h-3.5 w-3.5" /> Done
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}