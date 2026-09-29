import type { Appointment, Consultation, FollowUp, Payment, Treatment } from '@/types'
import { format, isSameDay } from 'date-fns'

export type TimelineKind =
  | 'CONSULTATION'
  | 'SYMPTOM'
  | 'ASSESSMENT'
  | 'TREATMENT'
  | 'OUTCOME'
  | 'FOLLOWUP'
  | 'PAYMENT'
  | 'APPOINTMENT'
  | 'MEASUREMENT'
  | 'NOTE'

export interface TimelineEntry {
  id: string
  occurredAt: string
  groupKey: string
  groupLabel: string
  kind: TimelineKind
  emblem: string
  title: string
  description: string
  meta?: Record<string, string | number | null | undefined>
  patientId: string
  consultationId?: string
}

const EMBLEMS: Record<TimelineKind, string> = {
  CONSULTATION: '🩺',
  SYMPTOM: '🩹',
  ASSESSMENT: '🔍',
  TREATMENT: '💊',
  OUTCOME: '📈',
  FOLLOWUP: '📅',
  PAYMENT: '💳',
  APPOINTMENT: '🗓️',
  MEASUREMENT: '📏',
  NOTE: '📝',
}

function consultationLabel(c: Consultation, index: number): string {
  const isFollow = c.followUps.length > 0 || index > 0
  if (c.chiefComplaint?.toLowerCase().includes('review')) return 'Review Consultation'
  if (isFollow && index > 0) return 'Follow-up Consultation'
  return 'Initial Consultation'
}

/**
 * Builds the chronological patient story from source records.
 * The timeline is always derived — never stored — so it stays in sync
 * with consultations, treatments, measurements, payments and appointments.
 */
export function buildTimeline(args: {
  consultations: Consultation[]
  treatments: Treatment[]
  payments: Payment[]
  appointments: Appointment[]
  followUps: FollowUp[]
  measurements?: { id: string; type: string; value: number; unit?: string | null; recordedAt: string; patientId: string; visitId?: string | null }[]
}): TimelineEntry[] {
  const { treatments, payments, appointments, followUps, measurements = [] } = args
  const entries: TimelineEntry[] = []

  // Group treatments by consultation where possible, else standalone.
  const byConsultation = new Map<string, Treatment[]>()
  for (const t of treatments) {
    if (t.consultationId) {
      const list = byConsultation.get(t.consultationId) ?? []
      list.push(t)
      byConsultation.set(t.consultationId, list)
    }
  }

  // Sort consultations chronologically (oldest first)
  const ordered = [...args.consultations].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  ordered.forEach((c, idx) => {
    const groupKey = `consultation-${c.id}`
    const groupLabel = consultationLabel(c, idx)
    const dayLabel = format(new Date(c.date), 'EEEE, dd MMM yyyy')

    // 1 — Consultation event
    entries.push({
      id: `${c.id}-consultation`,
      occurredAt: c.date,
      groupKey,
      groupLabel,
      kind: 'CONSULTATION',
      emblem: EMBLEMS.CONSULTATION,
      title: groupLabel,
      description: c.chiefComplaint || c.clinicalNotes || 'Consultation recorded',
      meta: {
        Doctor: c.doctor?.name,
        Status: c.status,
        Notes: c.clinicalNotes,
        'Recorded on': dayLabel,
      },
      patientId: c.patientId,
      consultationId: c.id,
    })

    // 2 — Symptoms
    for (const s of c.symptoms) {
      entries.push({
        id: `${c.id}-symptom-${s.id}`,
        occurredAt: c.date,
        groupKey,
        groupLabel,
        kind: 'SYMPTOM',
        emblem: EMBLEMS.SYMPTOM,
        title: `Symptom: ${s.name}`,
        description: `${s.severity === 'UNSPECIFIED' ? 'Reported' : s.severity.toLowerCase()}${s.duration ? ` · ${s.duration}` : ''}`,
        meta: { Symptom: s.name, Severity: s.severity, Duration: s.duration, Notes: s.notes },
        patientId: c.patientId,
        consultationId: c.id,
      })
    }

    // 3 — Assessment / diagnosis
    if (c.assessment) {
      entries.push({
        id: `${c.id}-assessment`,
        occurredAt: c.date,
        groupKey,
        groupLabel,
        kind: 'ASSESSMENT',
        emblem: EMBLEMS.ASSESSMENT,
        title: 'Assessment',
        description: c.assessment,
        patientId: c.patientId,
        consultationId: c.id,
      })
    }

    // 4 — Treatments bound to this consultation
    for (const t of byConsultation.get(c.id) ?? []) {
      entries.push({
        id: `${c.id}-treatment-${t.id}`,
        occurredAt: c.date,
        groupKey,
        groupLabel,
        kind: 'TREATMENT',
        emblem: EMBLEMS.TREATMENT,
        title: t.name,
        description: treatmentLine(t),
        meta: {
          Type: t.type,
          Instructions: t.instructions,
          Dosage: t.dosage,
          Status: t.status,
          Response: t.response !== 'UNSET' ? t.response : undefined,
        },
        patientId: c.patientId,
        consultationId: c.id,
      })
    }

    // 5 — Outcomes
    for (const o of c.outcomes) {
      entries.push({
        id: `${c.id}-outcome-${o.id}`,
        occurredAt: c.date,
        groupKey,
        groupLabel,
        kind: 'OUTCOME',
        emblem: EMBLEMS.OUTCOME,
        title: o.metric ? `${o.metric} — ${o.response}` : `Outcome — ${o.response}`,
        description: outcomeLine(o),
        meta: {
          Metric: o.metric,
          Previous: o.previousValue,
          Current: o.currentValue,
          Response: o.response,
          Notes: o.notes,
        },
        patientId: c.patientId,
        consultationId: c.id,
      })
    }

    // 6 — Follow-up for this consultation
    for (const f of c.followUps) {
      entries.push({
        id: `${c.id}-followup-${f.id}`,
        occurredAt: c.date,
        groupKey,
        groupLabel,
        kind: 'FOLLOWUP',
        emblem: EMBLEMS.FOLLOWUP,
        title: 'Follow-up scheduled',
        description: `${format(new Date(f.scheduledDate), 'dd MMMM')}${f.reason ? ` — ${f.reason}` : ''}`,
        meta: {
          'Scheduled for': new Date(f.scheduledDate).toISOString(),
          Reason: f.reason,
          Status: f.status,
        },
        patientId: c.patientId,
        consultationId: c.id,
      })
    }
  })

  // Standalone payments → timeline events
  for (const p of payments) {
    entries.push({
      id: `payment-${p.id}`,
      occurredAt: p.paymentDate,
      groupKey: `payment-${p.id}`,
      groupLabel: 'Payment',
      kind: 'PAYMENT',
      emblem: EMBLEMS.PAYMENT,
      title: `Payment — ${p.status}`,
      description: `${p.description ?? 'Payment'} · ${p.method}`,
      meta: { Amount: p.amount, Method: p.method, Status: p.status },
      patientId: p.patientId,
    })
  }

  // Measurements → timeline events (grouped per day so trends stay readable).
  const byDay = new Map<string, typeof measurements>()
  for (const m of measurements) {
    const day = new Date(m.recordedAt).toDateString()
    const list = byDay.get(day) ?? []
    list.push(m)
    byDay.set(day, list)
  }
  for (const [day, list] of byDay) {
    const summary = list.map((m) => `${m.type.replace(/_/g, ' ')} ${Math.round(m.value * 100) / 100}${m.unit ? ` ${m.unit}` : ''}`).join(' · ')
    entries.push({
      id: `measure-${day}-${list[0].id}`,
      occurredAt: list[0].recordedAt,
      groupKey: `measure-${day}`,
      groupLabel: 'Measurements',
      kind: 'MEASUREMENT',
      emblem: EMBLEMS.MEASUREMENT,
      title: 'Measurements recorded',
      description: summary.slice(0, 220),
      meta: { Count: list.length },
      patientId: list[0].patientId,
      consultationId: list[0].visitId ?? undefined,
    })
  }

  // Standalone appointments that aren't bound to a consultation.
  const usedConsultationIds = new Set(args.consultations.map((c) => c.id))
  for (const a of appointments) {
    if (usedConsultationIds.has(a.id)) continue
    entries.push({
      id: `appointment-${a.id}`,
      occurredAt: a.date,
      groupKey: `appointment-${a.id}`,
      groupLabel: 'Appointment',
      kind: 'APPOINTMENT',
      emblem: EMBLEMS.APPOINTMENT,
      title: `Appointment — ${a.status}`,
      description: `${a.type}${a.reason ? ` · ${a.reason}` : ''}`,
      meta: { Time: new Date(a.date).toISOString(), Status: a.status, Type: a.type },
      patientId: a.patientId,
    })
  }

  // Standalone follow-ups not tied to a specific consultation event
  const usedConsultationIds2 = new Set(args.consultations.map((c) => c.id))
  for (const f of followUps) {
    if (f.consultationId && usedConsultationIds2.has(f.consultationId)) continue
    entries.push({
      id: `followup-${f.id}`,
      occurredAt: f.scheduledDate,
      groupKey: `followup-${f.id}`,
      groupLabel: 'Follow-up',
      kind: 'FOLLOWUP',
      emblem: EMBLEMS.FOLLOWUP,
      title: 'Follow-up',
      description: `${f.reason ?? 'Scheduled visit'} · ${f.status}`,
      meta: { Status: f.status, Reason: f.reason },
      patientId: f.patientId,
    })
  }

  return entries.sort(
    (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime()
  )
}

function treatmentLine(t: Treatment): string {
  const parts: string[] = []
  if (t.instructions) parts.push(t.instructions)
  if (t.status !== 'PRESCRIBED') parts.push(t.status.toLowerCase())
  if (t.response !== 'UNSET') parts.push(t.response.toLowerCase())
  return parts.length ? parts.join(' · ') : t.type.toLowerCase()
}

function outcomeLine(o: { metric: string; previousValue?: string | null; currentValue?: string | null; response: string }): string {
  if (o.previousValue && o.currentValue) {
    return `${o.metric}: ${o.previousValue} → ${o.currentValue}`
  }
  return `${o.metric}: ${o.currentValue ?? 'recorded'}`
}

// Group timeline entries into day buckets for rendering.
export function groupTimelineByDay(entries: TimelineEntry[]) {
  const days: { date: string; label: string; groups: TimelineEntry[][] }[] = []
  for (const entry of entries) {
    const dayKey = new Date(entry.occurredAt).toDateString()
    const last = days[days.length - 1]
    if (last && last.date === dayKey) {
      let g = last.groups.find((gr) => gr[0]?.groupKey === entry.groupKey)
      if (!g) {
        g = []
        last.groups.push(g)
      }
      g.push(entry)
    } else {
      days.push({ date: dayKey, label: format(new Date(entry.occurredAt), 'd MMM yyyy'), groups: [[entry]] })
    }
  }
  // Sort groups within a day by consultation order (oldest first).
  for (const d of days) {
    d.groups.sort((a, b) => new Date(a[0].occurredAt).getTime() - new Date(b[0].occurredAt).getTime())
  }
  return days
}

export function diffDays(a: string | Date, b: string | Date): number {
  const da = new Date(a)
  const db = new Date(b)
  return Math.round((db.getTime() - da.getTime()) / 86400000)
}

export function isOverdue(date: string): boolean {
  const d = new Date(date)
  const now = new Date()
  return d.getTime() < now.getTime() && !isSameDay(d, now) && diffDays(date, now.toISOString()) > 0
}