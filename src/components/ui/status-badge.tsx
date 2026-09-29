import { Badge, type BadgeVariant } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface StatusBadgeProps {
  status: string
  label: string
  variant?: BadgeVariant
  dotClassName?: string
}

/** Status shown with BOTH a dot color and a text label, so meaning is never color-only. */
export function StatusBadge({ status, label, variant, dotClassName }: StatusBadgeProps) {
  return (
    <span className="status-indicator" aria-label={`${label} (${status})`}>
      <Badge variant={variant ?? variantForStatus(status)} className="gap-1.5">
        <span
          aria-hidden
          className={cn("h-1.5 w-1.5 rounded-full", dotClassName ?? dotForStatus(status))}
        />
        {label}
      </Badge>
    </span>
  )
}

export function variantForStatus(status: string): BadgeVariant {
  switch (status) {
    case "PAID":
    case "COMPLETED":
    case "IMPROVING":
    case "RECOVERED":
    case "IMPROVED":
    case "SUCCESS":
      return "success"
    case "PENDING":
    case "PARTIAL":
    case "DUE":
    case "SCHEDULED":
    case "WAITING":
      return "warning"
    case "OVERDUE":
    case "NO_SHOW":
    case "CANCELLED":
    case "WORSENED":
    case "NO_RESPONSE":
    case "MISSED":
      return "destructive"
    case "ACTIVE":
    case "CONSULTATION":
    case "IN_CONSULTATION":
      return "info"
    default:
      return "secondary"
  }
}

export function dotForStatus(status: string): string {
  switch (status) {
    case "PAID":
    case "COMPLETED":
    case "IMPROVING":
    case "RECOVERED":
    case "SUCCESS":
      return "bg-success"
    case "PENDING":
    case "PARTIAL":
    case "DUE":
    case "SCHEDULED":
    case "WAITING":
      return "bg-warning"
    case "OVERDUE":
    case "NO_SHOW":
    case "CANCELLED":
    case "WORSENED":
    case "MISSED":
      return "bg-destructive"
    case "ACTIVE":
    case "CONSULTATION":
    case "IN_CONSULTATION":
      return "bg-info"
    default:
      return "bg-muted-foreground"
  }
}