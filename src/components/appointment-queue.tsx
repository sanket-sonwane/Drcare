"use client"

import { startTransition, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { CalendarPlus, Play, PhoneCall, Check, X, Ban, Loader2, Stethoscope } from "lucide-react"
import type { Appointment, AppointmentStatus } from "@/types"
import { createAppointmentAction, updateAppointmentStatusAction } from "@/lib/client-actions"
import { APPOINTMENT_STATUS_LABEL, APPOINTMENT_TYPES } from "@/lib/constants"
import { StatusBadge, variantForStatus, dotForStatus } from "@/components/ui/status-badge"
import { formatDate, fullName } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Label } from "@/components/ui/label"

const FLOW: AppointmentStatus[] = ["SCHEDULED", "CHECKED_IN", "WAITING", "IN_CONSULTATION"]

export function AppointmentQueue({ appointments, patients, date }: {
  appointments: Appointment[]
  patients: { id: string; label: string }[]
  date: string
}) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)

  function setStatus(apt: Appointment, status: AppointmentStatus) {
    setBusyId(apt.id)
    startTransition(async () => {
      try {
        await updateAppointmentStatusAction(apt.id, status)
        toast.success(`${apt.patient?.firstName ?? "Appointment"} → ${APPOINTMENT_STATUS_LABEL[status]}`)
        router.refresh()
      } catch {
        toast.error("Update failed")
      } finally {
        setBusyId(null)
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {appointments.length} appointment{appointments.length === 1 ? "" : "s"} for {formatDate(date, "EEEE, d MMM yyyy")}
        </p>
        <NewAppointmentButton patients={patients} defaultDate={date} />
      </div>

      {appointments.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">No appointments for this day.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">Patient</th>
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">Visit type</th>
                <th className="px-4 py-3 font-medium">Reason</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((apt) => (
                <tr key={apt.id} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <Link href={`/patients/${apt.patientId}`} className="font-medium hover:underline">
                      {apt.patient ? fullName(apt.patient as { firstName: string; lastName?: string | null }) : "Patient"}
                    </Link>
                    <span className="block text-xs text-muted-foreground">{apt.patient?.patientCode}</span>
                  </td>
                  <td className="px-4 py-3">{formatDate(apt.date, "hh:mm a")}</td>
                  <td className="px-4 py-3">{APPOINTMENT_TYPES.find((t) => t.value === apt.type)?.label ?? apt.type}</td>
                  <td className="px-4 py-3 text-muted-foreground">{apt.reason ?? "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      status={apt.status}
                      label={APPOINTMENT_STATUS_LABEL[apt.status]}
                      variant={variantForStatus(apt.status)}
                      dotClassName={dotForStatus(apt.status)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <QueueActions apt={apt} busy={busyId === apt.id} onAction={setStatus} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function QueueActions({ apt, busy, onAction }: { apt: Appointment; busy: boolean; onAction: (apt: Appointment, s: AppointmentStatus) => void }) {
  const idx = FLOW.indexOf(apt.status as AppointmentStatus)
  return (
    <div className="flex items-center gap-1.5">
      {idx !== -1 && idx < FLOW.length - 1 && (
        <IconButton
          title={`Mark ${FLOW[idx + 1].replaceAll("_", " ").toLowerCase()}`}
          busy={busy}
          onClick={() => onAction(apt, FLOW[idx + 1])}
        >
          <Play className="h-3.5 w-3.5" />
        </IconButton>
      )}
      {(apt.status === "WAITING" || apt.status === "CHECKED_IN" || apt.status === "IN_CONSULTATION") && (
        <Button asChild size="sm" variant="outline">
          <Link href={`/patients/${apt.patientId}/consultations/new`}>
            <Stethoscope className="h-3.5 w-3.5" /> Consult
          </Link>
        </Button>
      )}
      {apt.status !== "COMPLETED" && apt.status !== "NO_SHOW" && apt.status !== "CANCELLED" && (
        <>
          <IconButton title="Complete" busy={busy} onClick={() => onAction(apt, "COMPLETED")}>
            <Check className="h-3.5 w-3.5 text-success" />
          </IconButton>
          <IconButton title="No-show" busy={busy} onClick={() => onAction(apt, "NO_SHOW")}>
            <X className="h-3.5 w-3.5 text-warning-foreground" />
          </IconButton>
          <IconButton title="Cancel" busy={busy} onClick={() => onAction(apt, "CANCELLED")}>
            <Ban className="h-3.5 w-3.5 text-destructive" />
          </IconButton>
        </>
      )}
      {apt.status === "CHECKED_IN" && (
        <IconButton title="Call patient" busy={false} onClick={() => apt.patient?.phone && window.location.assign(`tel:${apt.patient.phone}`)}>
          <PhoneCall className="h-3.5 w-3.5" />
        </IconButton>
      )}
    </div>
  )
}

function IconButton({ title, busy, onClick, children }: { title: string; busy: boolean; onClick?: () => void; children: React.ReactNode }) {
  return (
    <button
      title={title}
      disabled={busy}
      onClick={onClick}
      aria-label={title}
      className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-border bg-background text-foreground transition-colors hover:bg-accent disabled:opacity-40 sm:h-8 sm:w-8"
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : children}
    </button>
  )
}

function NewAppointmentButton({ patients, defaultDate }: { patients: { id: string; label: string }[]; defaultDate: string }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  const [patientId, setPatientId] = useState(patients[0]?.id ?? "")
  const [date, setDate] = useState(defaultDate)
  const [time, setTime] = useState("10:00")
  const [type, setType] = useState("NEW_VISIT")
  const [reason, setReason] = useState("")

  function save() {
    if (!patientId) {
      toast.error("Select a patient")
      return
    }
    startTransition(async () => {
      try {
        await createAppointmentAction({
          patientId,
          date: new Date(`${date}T${time}`).toISOString(),
          type: type as Appointment["type"],
          reason: reason || undefined,
        })
        toast.success("Appointment booked")
        setOpen(false)
        router.refresh()
      } catch {
        toast.error("Could not book appointment")
      }
    })
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <CalendarPlus className="h-4 w-4" /> New Appointment
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm" onClick={() => setOpen(false)} aria-modal="true" role="dialog">
          <div className="w-full max-w-md rounded-lg border bg-card p-4 text-card-foreground shadow-lg sm:p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold">Book Appointment</h2>
            <p className="text-sm text-muted-foreground">Add to today&apos;s queue, or schedule for another day.</p>
            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="apt-patient">Patient</Label>
                <Select id="apt-patient" value={patientId} onChange={(e) => setPatientId(e.target.value)}>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="apt-date">Date</Label>
                  <Input id="apt-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apt-time">Time</Label>
                  <Input id="apt-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="apt-type">Visit type</Label>
                <Select id="apt-type" value={type} onChange={(e) => setType(e.target.value)}>
                  {APPOINTMENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="apt-reason">Reason</Label>
                <Input id="apt-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why the visit?" />
              </div>
              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="button" onClick={save} disabled={pending || !patientId}>
                  {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Book Appointment
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}