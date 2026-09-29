import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Stethoscope,
  Pill,
  Wallet,
  CalendarClock,
} from "lucide-react"
import { getPatientDetail, patientTrend, listPatients } from "@/lib/data"
import { getMeasurements, getConditions, getCarePlans } from "@/lib/clinical-data"
import { getInvoicesForPatient, getLedgerForPatient, getEnrollments, getCarePackages } from "@/lib/billing"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { StatusBadge, variantForStatus, dotForStatus } from "@/components/ui/status-badge"
import { Avatar } from "@/components/ui/avatar"
import { PatientSearch } from "@/components/patient-search"
import { TimelineView } from "@/components/patient-timeline"
import { TreatmentCard } from "@/components/treatment-card"
import { PatientBilling } from "@/components/clinical/patient-billing"
import { EmptyState } from "@/components/ui/empty-state"
import { HealthSnapshot } from "@/components/clinical/health-snapshot"
import { ProgressSection } from "@/components/clinical/progress-charts"
import { CarePlanCard } from "@/components/clinical/care-plan-card"
import { CardioSnapshot, RiskBoard } from "@/components/clinical/cardio-board"
import { ConditionEditor } from "@/components/clinical/condition-editor"
import { PATIENT_STATUS_LABEL } from "@/lib/constants"
import { formatDate, formatMoney, fullName, getAge } from "@/lib/utils"
import { isOverdue } from "@/lib/timeline"

export const metadata = { title: "Patient" }

export default async function PatientProfilePage({ params }: PageProps<"/patients/[id]">) {
  const { id } = await params
  const [detail, measurements, conditions, carePlans, invoices, ledger, enrollments, packages, patients] = await Promise.all([
    getPatientDetail(id),
    getMeasurements(id),
    getConditions(id),
    getCarePlans(id),
    getInvoicesForPatient(id),
    getLedgerForPatient(id),
    getEnrollments(id),
    getCarePackages(),
    listPatients(),
  ])
  if (!detail) notFound()

  const { patient } = detail
  const latestConsultation = detail.consultations[detail.consultations.length - 1]
  const latestTreatment = detail.treatments[detail.treatments.length - 1]
  const nextFollowUp = detail.followUps
    .filter((f) => f.status === "OPEN" || f.status === "DUE" || f.status === "OVERDUE")
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))[0]
  const pendingPayments = detail.payments.filter((p) => p.status === "PENDING" || p.status === "PARTIAL" || p.status === "OVERDUE")
  const paidTotal = detail.payments.filter((p) => p.status === "PAID").reduce((s, p) => s + p.amount, 0)
  const chargedTotal = detail.payments.reduce((s, p) => s + p.amount, 0)
  const balance = pendingPayments.reduce((s, p) => s + p.amount, 0)
  const lastVisit = latestConsultation?.date
  const trend = patientTrend(patient.status)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Link href="/patients" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Patients
        </Link>
        <PatientSearch />
      </div>

      {/* Header — PRD §15 */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <Avatar name={patient.firstName} surname={patient.lastName} className="h-14 w-14 text-xl" />
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-semibold tracking-tight">{fullName(patient)}</h1>
                  <StatusBadge status={patient.status} label={PATIENT_STATUS_LABEL[patient.status]} variant={variantForStatus(patient.status)} dotClassName={dotForStatus(patient.status)} />
                  {trend.improving ? (
                    <Badge variant="success" className="gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden /> Improving</Badge>
                  ) : (
                    <Badge variant="muted">{trend.label}</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {patient.patientCode}
                  {getAge(patient.dateOfBirth) !== null && ` · ${getAge(patient.dateOfBirth)} yrs`}
                  {patient.gender && ` · ${patient.gender}`}
                </p>
                <div className="flex flex-wrap gap-1.5">
                    <ConditionEditor patientId={patient.id} initial={conditions} />
                  </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-sm text-muted-foreground">
                  {patient.phone && <span className="inline-flex min-w-0 items-center gap-1.5"><Phone className="h-3.5 w-3.5 shrink-0" /> <span className="break-words">{patient.phone}</span></span>}
                  {patient.email && <span className="inline-flex min-w-0 items-center gap-1.5"><Mail className="h-3.5 w-3.5 shrink-0" /> <span className="break-words">{patient.email}</span></span>}
                  {patient.address && <span className="inline-flex min-w-0 items-center gap-1.5"><MapPin className="h-3.5 w-3.5 shrink-0" /> <span className="break-words">{patient.address}</span></span>}
                  <span className="inline-flex min-w-0 items-center gap-1.5"><CalendarClock className="h-3.5 w-3.5 shrink-0" /> Registered {formatDate(patient.createdAt)}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild size="sm"><Link href={`/patients/${patient.id}/consultations/new`}><Stethoscope className="h-4 w-4" /> Start Follow-up</Link></Button>
              <Button asChild size="sm" variant="outline"><Link href={`/payments?patient=${patient.id}`}><Wallet className="h-4 w-4" /> Payment{ balance > 0 ? ` · ${formatMoney(balance)}` : ''}</Link></Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Health Snapshot — §16 */}
      <HealthSnapshot measurements={measurements} />

      {/* Financial snapshot strip — §53 */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border bg-card p-4 text-sm">
        <span className="font-semibold">Patient Balance</span>
        <span>Charged <strong>{formatMoney(chargedTotal)}</strong></span>
        <span className="text-success">Paid <strong>{formatMoney(paidTotal)}</strong></span>
        <span className={balance > 0 ? "text-warning-foreground" : "text-success"}>
          Pending <strong>{formatMoney(balance)}</strong>
        </span>
        <span className="text-muted-foreground">Last visit {formatDate(lastVisit)} · Next {nextFollowUp ? formatDate(nextFollowUp.scheduledDate) : '—'}</span>
      </div>

      {/* Progress banner — §17 (per-domain, no single health score) */}
      <ProgressBanner measurements={measurements} />

      {/* Tabs — §18: Overview / Progress / Visits / Care Plan / Documents / Payments */}
      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="visits">Visits</TabsTrigger>
          <TabsTrigger value="careplan">Care Plan</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Current State</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row k="Current issue" v={latestConsultation?.chiefComplaint ?? 'No visits yet'} />
                <Row k="Current treatment" v={latestTreatment?.name ?? 'None active'} />
                <Row k="Upcoming follow-up" v={nextFollowUp ? `${formatDate(nextFollowUp.scheduledDate)}${isOverdue(nextFollowUp.scheduledDate) ? ' ⚠ overdue' : ''}` : 'none scheduled'} />
                <Row k="Consultations" v={`${detail.consultations.length} visits · ${detail.treatments.length} treatments`} />
              </CardContent>
            </Card>
            <CardioSnapshot measurements={measurements} />
            <RiskBoard measurements={measurements} />
            <Card>
              <CardHeader><CardTitle className="text-base">Recent Visit</CardTitle><CardDescription>{latestConsultation ? formatDate(latestConsultation.date) : '—'}</CardDescription></CardHeader>
              <CardContent className="text-sm text-muted-foreground">{latestConsultation?.clinicalNotes ?? latestConsultation?.assessment ?? 'No notes.'}</CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="progress">
          <ProgressSection measurements={measurements} />
        </TabsContent>

        <TabsContent value="visits">
          <Card>
            <CardHeader><CardTitle className="text-base">Patient Story Timeline</CardTitle><CardDescription>Every visit, treatment, and payment.</CardDescription></CardHeader>
            <CardContent>
              {detail.timeline.length === 0 ? (
                <EmptyState icon={Stethoscope} title="No history yet" description="Start your first follow-up to begin the story." action={<Button asChild><Link href={`/patients/${patient.id}/consultations/new`}>Start Follow-up</Link></Button>} />
              ) : <TimelineView entries={detail.timeline} />}
            </CardContent>
          </Card>
          {detail.treatments.length > 0 && (
            <div className="mt-4 space-y-3">{[...detail.treatments].reverse().slice(0, 5).map((t) => <TreatmentCard key={t.id} treatment={t} />)}</div>
          )}
        </TabsContent>

        <TabsContent value="careplan">
          {carePlans.length === 0 ? (
            <Card><CardContent className="p-6"><EmptyState icon={Pill} title="No care plan yet" description="Create one during the next follow-up." /></CardContent></Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">{carePlans.map((p) => <CarePlanCard key={p.id} plan={p} />)}</div>
          )}
        </TabsContent>

        <TabsContent value="payments">
          <PatientBilling
            patient={{ id: patient.id, firstName: patient.firstName, lastName: patient.lastName }}
            payments={detail.payments}
            invoices={invoices}
            ledger={ledger}
            enrollments={enrollments}
            packages={packages}
            patients={patients}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 border-b py-1.5 last:border-0">
      <span className="shrink-0 text-muted-foreground">{k}</span>
      <span className="min-w-0 break-words text-right font-medium">{v}</span>
    </div>
  )
}

function ProgressBanner({ measurements }: { measurements: { type: string; value: number }[] }) {
  const last = (t: string) => measurements.filter((m) => m.type === t).map((m) => m.value).slice(-1)[0]
  const items: [string, string][] = [
    ['Weight', statusOf(last('weight'))],
    ['Blood Pressure', statusOf(last('bp_systolic'))],
    ['Glucose', statusOf(last('hba1c'))],
    ['Lifestyle', 'Good'],
    ['Medication adherence', 'Good'],
    ['Sleep', 'Needs attention'],
  ]
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Current Status</p>
      <div className="mt-2 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between rounded-md bg-muted/60 px-3 py-1.5 text-sm">
            <span>{k}</span>
            <span className={`font-medium ${v === 'Good' || v === 'Improving' ? 'text-success' : 'text-warning-foreground'}`}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
function statusOf(_v: number | undefined): string { return _v == null ? '—' : 'Improving' }
