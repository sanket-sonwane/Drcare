import Link from "next/link"
import { format } from "date-fns"
import {
  Users,
  CalendarClock,
  Wallet,
  Banknote,
  AlertTriangle,
  BellRing,
  Plus,
} from "lucide-react"
import { getDashboard, getSessionUser } from "@/lib/data"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { StatusBadge, variantForStatus, dotForStatus } from "@/components/ui/status-badge"
import { PatientSearch } from "@/components/patient-search"
import { Button } from "@/components/ui/button"
import { formatMoney, formatDate, fullName, greeting } from "@/lib/utils"
import { APPOINTMENT_STATUS_LABEL, APPOINTMENT_TYPES } from "@/lib/constants"
import { EmptyState } from "@/components/ui/empty-state"

export const metadata = { title: "Dashboard" }

export default async function DashboardPage() {
  const [user, data] = await Promise.all([getSessionUser(), getDashboard()])
  const kpi = data.kpis
  const today = new Date()

  const kpis = [
    {
      label: "Today's Patients",
      value: String(kpi.todaysPatients),
      hint: "confirmed for today",
      icon: Users,
      tint: "text-primary",
      href: "/appointments",
    },
    {
      label: "Follow-ups Due",
      value: String(kpi.followUps),
      hint: `${kpi.overdueFollowUps} overdue`,
      icon: CalendarClock,
      tint: kpi.overdueFollowUps ? "text-warning-foreground" : "text-primary",
      href: "/patients?filter=followup",
    },
    {
      label: "Today's Collection",
      value: formatMoney(kpi.todaysCollection),
      hint: "collected today",
      icon: Banknote,
      tint: "text-success",
      href: "/payments?tab=today",
    },
    {
      label: "Pending Payments",
      value: formatMoney(kpi.pendingFees),
      hint: `${kpi.pendingPayments} open`,
      icon: Wallet,
      tint: "text-warning-foreground",
      href: "/payments?tab=pending",
    },
  ]
  const expectedToday = kpi.todaysCollection + kpi.pendingFees

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {greeting()}, {user?.name.split(" ")[0]} 👋
          </h1>
          <p className="text-sm text-muted-foreground">
            {format(today, "EEEE, d MMMM yyyy")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <PatientSearch />
          <div className="flex gap-2">
            <Button asChild size="sm">
              <Link href="/patients/new">
                <Plus className="h-4 w-4" /> New Patient
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/appointments?new=1">New Appointment</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <section aria-label="Key metrics">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((k) => (
            <Link key={k.label} href={k.href} className="h-full">
              <Card className="h-full animate-fade-in-up transition-colors hover:bg-accent/40">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">{k.label}</p>
                      <p className="text-2xl font-semibold tracking-tight">{k.value}</p>
                      <p className="text-xs text-muted-foreground">{k.hint}</p>
                    </div>
                    <span className="rounded-lg border bg-muted/60 p-2">
                      <k.icon className={`h-5 w-5 ${k.tint}`} />
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

{/* Revenue + Progress snapshots (§12-13) */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="flex flex-wrap gap-6 p-5 text-sm">
            <span className="text-muted-foreground">TODAY</span>
            <span>Collected <strong className="font-semibold text-success">{formatMoney(kpi.todaysCollection)}</strong></span>
            <span>Expected <strong>{formatMoney(expectedToday)}</strong></span>
            <span className="text-warning-foreground">Pending <strong>{formatMoney(kpi.pendingFees)}</strong></span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-wrap gap-6 p-5 text-sm">
            <span>Patients Improving <strong className="font-semibold text-success">{data.progress.improvingPct}%</strong></span>
            <span>Follow-ups Completed <strong>{data.progress.followUpsCompletedPct}%</strong></span>
            <span>Care Plan Adherence <strong>{data.progress.careAdherencePct}%</strong></span>
            <span className="w-full text-[11px] text-muted-foreground">Derived live · {data.progress.carePlanItemsTotal} care items ({data.progress.carePlanItemsDone} done) · {data.progress.totalPatients} patients</span>
          </CardContent>
        </Card>
      </div>

      {/* Queue + Attention */}
      <div className="grid gap-6 xl:grid-cols-3">
        {/* Today's queue */}
        <Card className="xl:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Today&apos;s Queue</CardTitle>
              <CardDescription>Who you need to see today</CardDescription>
            </div>
            <Button asChild size="sm" variant="ghost">
              <Link href="/appointments">Manage queue →</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {data.queue.length === 0 ? (
              <EmptyState title="No appointments today" description="Book an appointment or add a walk-in to start the queue." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="py-2 pr-4 font-medium">Time</th>
                      <th className="py-2 pr-4 font-medium">Patient</th>
                      <th className="py-2 pr-4 font-medium">Visit Type</th>
                      <th className="py-2 pr-4 font-medium">Status</th>
                      <th className="py-2 pr-4 font-medium">Payment</th>
                      <th className="py-2 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.queue.map((a) => {
                      const pay = data.attention.pendingPayments.find((p) => p.patientId === a.patientId)
                      return (
                        <tr key={a.id} className="border-b last:border-0">
                          <td className="py-3 pr-4">{format(new Date(a.date), "hh:mm a")}</td>
                          <td className="py-3 pr-4">
                            <Link href={`/patients/${a.patientId}`} className="font-medium hover:underline">
                              {a.patient ? fullName(a.patient as { firstName: string; lastName?: string | null }) : "—"}
                            </Link>
                            <span className="block text-xs text-muted-foreground">
                              {a.patient?.patientCode}
                            </span>
                          </td>
                          <td className="py-3 pr-4">{APPOINTMENT_TYPES.find((t) => t.value === a.type)?.label ?? a.type}</td>
                          <td className="py-3 pr-4">
                            <StatusBadge
                              status={a.status}
                              label={APPOINTMENT_STATUS_LABEL[a.status]}
                              variant={variantForStatus(a.status)}
                              dotClassName={dotForStatus(a.status)}
                            />
                          </td>
                          <td className="py-3 pr-4">
                            {a.status === "COMPLETED" && !pay ? (
                              <StatusBadge status="PAID" label="Paid" variant="success" dotClassName="bg-success" />
                            ) : pay ? (
                              <StatusBadge status="PENDING" label={`${formatMoney(pay.amount)} Pending`} variant="warning" dotClassName="bg-warning" />
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="py-3">
                            <Button asChild size="sm" variant="outline">
                              <Link href={`/patients/${a.patientId}`}>Open</Link>
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attention center */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Attention Center</CardTitle>
            <CardDescription>What requires action</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <AttentionRow
              icon={<AlertTriangle className="h-4 w-4" />}
              tint="text-destructive"
              text={`${kpi.overdueFollowUps} follow-up${kpi.overdueFollowUps === 1 ? "" : "s"} overdue`}
            />
            <AttentionRow
              icon={<Wallet className="h-4 w-4" />}
              tint="text-warning-foreground"
              text={`${kpi.pendingPayments} payment${kpi.pendingPayments === 1 ? "" : "s"} pending`}
            />
            <AttentionRow
              icon={<AlertTriangle className="h-4 w-4" />}
              tint="text-warning-foreground"
              text={`${kpi.incompleteIntakes} patient${kpi.incompleteIntakes === 1 ? "" : "s"} haven't completed intake`}
            />
            <AttentionRow
              icon={<BellRing className="h-4 w-4" />}
              tint="text-success"
              text={`${kpi.completedConsultations} consultations completed today`}
            />

            {data.attention.overdueFollowUps.length > 0 && (
              <div className="mt-2 space-y-2 border-t pt-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Overdue follow-ups</p>
                {data.attention.overdueFollowUps.map((f) => {
                  const patient = data.queue.find((a) => a.patientId === f.patientId)?.patient
                  return (
                    <div key={f.id} className="flex items-center justify-between rounded-md bg-muted/60 px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {patient ? fullName(patient as { firstName: string; lastName?: string | null }) : "Patient"}
                        </p>
                        <p className="text-xs text-muted-foreground">Due {formatDate(f.scheduledDate)}</p>
                      </div>
                      <Link href={`/patients/${f.patientId}`} className="text-xs font-medium text-primary hover:underline">
                        Open
                      </Link>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {(kpi.pendingFees > 0 || kpi.followUps > 0) && (
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-6">
                <div>
                  <p className="text-sm text-muted-foreground">Pending fees need attention</p>
                  <p className="text-xl font-semibold">{formatMoney(kpi.pendingFees)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Follow-ups due or overdue</p>
                  <p className="text-xl font-semibold">{kpi.followUps}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href="/payments">Review payments</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="/patients?filter=followup">Review follow-ups</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function AttentionRow({ icon, tint, text }: { icon: React.ReactNode; tint: string; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-md border bg-card px-3 py-2.5">
      <span className={tint}>{icon}</span>
      <span className="text-sm font-medium">{text}</span>
    </div>
  )
}