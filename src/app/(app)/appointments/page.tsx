import { format } from "date-fns"
import { CalendarDays, Sparkles } from "lucide-react"
import { listAppointments, listFollowUps, getSessionUser } from "@/lib/data"
import { AppointmentQueue } from "@/components/appointment-queue"
import { FollowUpList } from "@/components/follow-up-list"
import { QueueDatePicker } from "@/components/queue-date-picker"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { fullName } from "@/lib/utils"
import { isOverdue } from "@/lib/timeline"

export const metadata = { title: "Appointments" }

export default async function AppointmentsPage({ searchParams }: PageProps<"/appointments">) {
  const sp = await searchParams
  const date = (sp.date as string) || format(new Date(), "yyyy-MM-dd")
  const [, patients, appointments, followUps] = await Promise.all([
    getSessionUser(),
    (await import("@/lib/data")).listPatientsWithMeta(),
    listAppointments({ date }),
    listFollowUps(),
  ])

  const patientOptions = patients.map((p) => ({
    id: p.id,
    label: `${fullName(p)} (${p.patientCode})`,
  }))

  const byId = new Map(patients.map((p) => [p.id, p]))
  const upcoming = followUps
    .filter((f) => f.status === "OPEN" || f.status === "DUE" || f.status === "OVERDUE")
    .map((f) => {
      const p = byId.get(f.patientId)
      return {
        id: f.id,
        patientId: f.patientId,
        patientName: p ? fullName(p) : "Patient",
        patientCode: p?.patientCode ?? "",
        scheduledDate: f.scheduledDate,
        reason: f.reason,
        status: f.status,
      }
    })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Appointments</h1>
          <p className="text-sm text-muted-foreground">Queue & follow-ups</p>
        </div>
        <form className="flex w-full items-center justify-end gap-2 sm:w-auto">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <QueueDatePicker defaultValue={date} />
          <button type="submit" className="hidden">
            Go
          </button>
        </form>
      </div>

      <AppointmentQueue appointments={appointments} patients={patientOptions} date={date} />

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Follow-up Schedule</CardTitle>
            <CardDescription>Upcoming and overdue follow-ups</CardDescription>
          </div>
          <Sparkles className="h-4 w-4 text-primary" aria-hidden />
        </CardHeader>
        <CardContent>
          <FollowUpList items={upcoming} />
        </CardContent>
      </Card>

      {upcoming.some((f) => isOverdue(f.scheduledDate)) && (
        <p className="text-sm text-warning-foreground">
          Some follow-ups are overdue — reach out to patients to reschedule.
        </p>
      )}
    </div>
  )
}