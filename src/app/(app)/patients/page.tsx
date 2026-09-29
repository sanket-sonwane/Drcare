import Link from "next/link"
import { Plus, Users } from "lucide-react"
import { listPatientsWithMeta } from "@/lib/data"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { PatientSearch } from "@/components/patient-search"
import { StatusBadge, variantForStatus, dotForStatus } from "@/components/ui/status-badge"
import { Avatar } from "@/components/ui/avatar"
import { EmptyState } from "@/components/ui/empty-state"
import { formatDate, formatMoney, fullName } from "@/lib/utils"
import { PATIENT_STATUS_LABEL, PATIENT_FILTERS } from "@/lib/constants"
import { isOverdue } from "@/lib/timeline"
import { getAllConditions } from "@/lib/clinical-data"
import { CsvExportButton } from "@/components/csv-export-button"

export const metadata = { title: "Patients" }

export default async function PatientsPage({ searchParams }: PageProps<"/patients">) {
  const sp = await searchParams
  const q = (sp.q as string) || ""
  const filter = (sp.filter as string) || "all"
  const [rows, allConditions] = await Promise.all([listPatientsWithMeta(), getAllConditions()])

  const condFor = (id: string) => allConditions.filter((c) => c.patientId === id).map((c) => c.condition.toLowerCase())

  let filtered = rows
  if (q) {
    const lower = q.toLowerCase()
    filtered = filtered.filter(
      (p) =>
        p.firstName.toLowerCase().includes(lower) ||
        p.lastName?.toLowerCase().includes(lower) ||
        p.patientCode.toLowerCase().includes(lower) ||
        p.phone?.includes(q) ||
        p.email?.toLowerCase().includes(lower) ||
        p.currentIssue?.toLowerCase().includes(lower)
    )
  }
  switch (filter) {
    case "active":
      filtered = filtered.filter((p) => p.status === "ACTIVE" || p.status === "IMPROVING")
      break
    case "followup":
      filtered = filtered.filter((p) => p.followUpDue)
      break
    case "payment":
      filtered = filtered.filter((p) => (p.paymentPending ?? 0) > 0)
      break
    case "new":
      filtered = filtered.filter((p) => p.status === "NEW")
      break
    case "archived":
      filtered = filtered.filter((p) => p.status === "ARCHIVED")
      break
    case "hypertension":
    case "diabetes":
    case "obesity":
    case "thyroid":
    case "pcod":
    case "joint":
    case "cardio":
      filtered = filtered.filter((p) => {
        const conds = condFor(p.id).join(' ')
        if (filter === 'pcod') return conds.includes('pcod') || conds.includes('pcos')
        if (filter === 'joint') return conds.includes('joint') || conds.includes('arthritis')
        if (filter === 'cardio') return conds.includes('cardio') || conds.includes('preventive')
        return conds.includes(filter)
      })
      break
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Patients</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} patients</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <PatientSearch placeholder="Search patients, IDs, phone…" />
          <CsvExportButton
            filename="patients"
            label="Export"
            headers={['Code', 'Name', 'Status', 'Phone', 'Email', 'Last visit', 'Current issue', 'Next follow-up', 'Payment pending']}
            rows={filtered.map((p) => [
              p.patientCode,
              fullName(p),
              PATIENT_STATUS_LABEL[p.status],
              p.phone ?? '',
              p.email ?? '',
              formatDate(p.lastVisit),
              p.currentIssue ?? '',
              p.followUpDue ? formatDate(p.followUpDue) : '',
              p.paymentPending ? String(p.paymentPending) : '0',
            ])}
          />
          <Button asChild>
            <Link href="/patients/new">
              <Plus className="h-4 w-4" /> New Patient
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Patient filters">
        {PATIENT_FILTERS.map((f) => {
          const active = filter === f.value
          return (
            <Link
              key={f.value}
              href={f.value === "all" ? "/patients" : `/patients?filter=${f.value}`}
              className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-card hover:bg-accent"
              }`}
              aria-pressed={active}
            >
              {f.label}
            </Link>
          )
        })}
      </div>

      <Card>
        {filtered.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Users}
              title={q ? `No patients match “${q}”` : "No patients yet"}
              description={
                q ? "Try a different search term or filter." : "Create your first patient and start building their complete care journey."
              }
              action={
                !q && (
                  <Button asChild>
                    <Link href="/patients/new">
                      <Plus className="h-4 w-4" /> Add Patient
                    </Link>
                  </Button>
                )
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Patient</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Last visit</th>
                  <th className="px-4 py-3 font-medium">Current issue</th>
                  <th className="px-4 py-3 font-medium">Next follow-up</th>
                  <th className="px-4 py-3 font-medium">Payment</th>
                  <th className="px-4 py-3 font-medium">Contact</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-muted/70">
                    <td className="px-4 py-3">
                      <Link href={`/patients/${p.id}`} className="flex items-center gap-3">
                        <Avatar name={p.firstName} surname={p.lastName} />
                        <span>
                          <span className="block font-medium hover:underline">{fullName(p)}</span>
                          <span className="block text-xs text-muted-foreground">{p.patientCode}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        status={p.status}
                        label={PATIENT_STATUS_LABEL[p.status]}
                        variant={variantForStatus(p.status)}
                        dotClassName={dotForStatus(p.status)}
                      />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(p.lastVisit)}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <span className="line-clamp-1 max-w-[220px]">{p.currentIssue ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3">
                      {p.followUpDue ? (
                        <span className={isOverdue(p.followUpDue) ? "font-medium text-destructive" : "text-muted-foreground"}>
                          {isOverdue(p.followUpDue) ? "⚠ " : ""}
                          {formatDate(p.followUpDue)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {(p.paymentPending ?? 0) > 0 ? (
                        <StatusBadge status="PENDING" label={formatMoney(p.paymentPending!)} variant="warning" dotClassName="bg-warning" />
                      ) : (
                        <StatusBadge status="PAID" label="Clear" variant="success" dotClassName="bg-success" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{p.phone ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}