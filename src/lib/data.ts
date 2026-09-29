import type {
  Appointment,
  Clinic,
  Consultation,
  FollowUp,
  Payment,
  Patient,
  PatientStatus,
  Treatment,
  User,
  DashboardKpis,
  DashboardProgress,
  InsightsOverview,
  SearchResult,
  AppointmentStatus,
  AppointmentType,
  PaymentMethod,
  PaymentStatus,
} from '@/types'
import { buildTimeline, type TimelineEntry } from './timeline'
import { uid } from './utils'
import {
  getDemoStore,
  getDashboardKpis as getDemoKpis,
  getInsights as getDemoInsights,
  notifications as demoNotifications,
} from './demo-data'
import { isLive, getPrisma } from './db'

// ────────────────────────────────────────────────────────────────
// Tenant safety helpers
// ────────────────────────────────────────────────────────────────

/**
 * Fail-closed demo gate: demo data must never be served from a production
 * deployment, even if env is misconfigured. Local dev/builds are unaffected
 * (VERCEL_ENV is unset outside Vercel).
 */
function demoStore() {
  if (process.env.VERCEL_ENV === 'production') {
    throw new Error('Demo mode is not available in production.')
  }
  return getDemoStore()
}

/** Session user or throw — use in every live mutation and scoped read. */
async function requireSessionUser(): Promise<User> {
  const user = await getSessionUser()
  if (!user) throw new Error('Unauthorized')
  return user
}

/**
 * Verify a patient belongs to the caller's clinic. Returns the user for
 * chaining. Throws 'Patient not found' for both missing AND cross-clinic
 * ids so existence is never revealed across tenants.
 */
async function assertPatientInClinic(patientId: string): Promise<User> {
  const user = await requireSessionUser()
  const prisma = getPrisma()
  const row = await prisma.patient.findFirst({
    where: { id: patientId, clinicId: user.clinicId },
    select: { id: true },
  })
  if (!row) throw new Error('Patient not found')
  return user
}

// Shared by sibling data layers (billing, clinical-data) that need the same
// tenant-scoped session guarantees without importing the private helpers.
export { requireSessionUser, assertPatientInClinic }

// ────────────────────────────────────────────────────────────────
// Shared Prisma row mappers (keeps scoped re-reads consistent)
// ────────────────────────────────────────────────────────────────

interface AppointmentRow {
  id: string
  clinicId: string
  patientId: string
  doctorId: string | null
  date: Date
  type: Appointment['type']
  status: Appointment['status']
  reason: string | null
  notes: string | null
  queueNumber: number | null
  patient: { id: string; firstName: string; lastName: string | null; patientCode: string; phone: string | null } | null
  doctor: { id: string; name: string } | null
}

const appointmentInclude = {
  patient: { select: { id: true, firstName: true, lastName: true, patientCode: true, phone: true } },
  doctor: { select: { id: true, name: true } },
}

function mapAppointment(r: AppointmentRow): Appointment {
  return {
    id: r.id,
    clinicId: r.clinicId,
    patientId: r.patientId,
    doctorId: r.doctorId,
    date: r.date.toISOString(),
    type: r.type,
    status: r.status,
    reason: r.reason,
    notes: r.notes,
    queueNumber: r.queueNumber,
    patient: r.patient && { id: r.patient.id, firstName: r.patient.firstName, lastName: r.patient.lastName, patientCode: r.patient.patientCode, phone: r.patient.phone },
    doctor: r.doctor,
  }
}

interface PaymentRow {
  id: string
  clinicId: string
  patientId: string
  invoiceId: string | null
  amount: number
  method: Payment['method']
  status: Payment['status']
  transactionReference: string | null
  description: string | null
  paymentDate: Date
  recordedBy: { name: string } | null
  patient: { id: string; firstName: string; lastName: string | null; patientCode: string } | null
}

const paymentInclude = {
  patient: { select: { id: true, firstName: true, lastName: true, patientCode: true } },
  recordedBy: { select: { name: true } },
}

function mapPayment(p: PaymentRow): Payment {
  return {
    id: p.id,
    clinicId: p.clinicId,
    patientId: p.patientId,
    invoiceId: p.invoiceId,
    amount: p.amount,
    method: p.method,
    status: p.status,
    transactionReference: p.transactionReference,
    description: p.description,
    paymentDate: p.paymentDate.toISOString(),
    recordedByName: p.recordedBy?.name ?? null,
    patient: p.patient && { id: p.patient.id, firstName: p.patient.firstName, lastName: p.patient.lastName, patientCode: p.patient.patientCode },
  }
}

interface FollowUpRow {
  id: string
  patientId: string
  consultationId: string | null
  scheduledDate: Date
  reason: string | null
  status: FollowUp['status']
  reminderDays: number
  completedAt: Date | null
}

function mapFollowUp(f: FollowUpRow): FollowUp {
  return {
    id: f.id,
    patientId: f.patientId,
    consultationId: f.consultationId,
    scheduledDate: f.scheduledDate.toISOString(),
    reason: f.reason,
    status: f.status,
    reminderDays: f.reminderDays,
    completedAt: f.completedAt?.toISOString() ?? null,
  }
}

export interface AttentionItem {
  overdueFollowUps: FollowUp[]
  pendingPayments: Payment[]
  incompleteIntakes: number
}

export interface DashboardData {
  kpis: DashboardKpis
  progress: DashboardProgress
  queue: Appointment[]
  attention: AttentionItem
  notifications: { id: string; title: string; body: string | null; type: string }[]
}

export interface PatientDetail {
  patient: Patient
  consultations: Consultation[]
  treatments: Treatment[]
  payments: Payment[]
  appointments: Appointment[]
  followUps: FollowUp[]
  timeline: TimelineEntry[]
}

export interface FinancialSummary {
  todayCollection: number
  pendingFees: number
  overdueFees: number
  monthCollection: number
}

export interface NewConsultationInput {
  patientId: string
  doctorId: string
  date?: string
  chiefComplaint?: string
  clinicalNotes?: string
  assessment?: string
  symptoms?: { name: string; severity: string; duration?: string }[]
  treatments?: { type: Treatment['type']; name: string; instructions?: string; dosage?: string }[]
  outcomes?: { metric: string; previousValue?: string; currentValue?: string; response: string }[]
  followUp?: { scheduledDate?: string; reason?: string } | null
  fee?: number // minor units — full visit fee
  paidNow?: number // minor units — what was actually received (PAID: fee, PARTIAL: partial)
  paymentStatus?: PaymentStatus
  paymentMethod?: PaymentMethod
  isAiGenerated?: boolean
}

export interface NewPatientInput {
  firstName: string
  lastName?: string
  dateOfBirth?: string
  gender?: string
  phone?: string
  email?: string
  address?: string
  emergencyContact?: string
}

export interface NewAppointmentInput {
  patientId: string
  date: string
  type?: AppointmentType
  reason?: string
  notes?: string
}

export interface NewPaymentInput {
  patientId: string
  amount: number // minor units
  method: PaymentMethod
  status?: PaymentStatus
  description?: string
  date?: string
}

// ────────────────────────────────────────────────────────────────
// User / auth resolution
// ────────────────────────────────────────────────────────────────

export async function getSessionUser(): Promise<User | null> {
  if (!isLive()) {
    return demoStore().user
  }
  const prisma = getPrisma()
  const { getServerSession } = await import('./supabase/server')
  const session = await getServerSession()
  if (!session?.email) return null
  const user = await prisma.user.findUnique({
    where: { email: session.email },
    include: { clinic: true },
  })
  return user ? mapUser(user) : null
}

function mapUser(u: { id: string; clinicId: string; name: string; email: string; role: User['role']; specialty?: string | null; phone?: string | null; avatarUrl?: string | null }): User {
  return { id: u.id, clinicId: u.clinicId, name: u.name, email: u.email, role: u.role, specialty: u.specialty, phone: u.phone, avatarUrl: u.avatarUrl }
}

export async function getClinic(): Promise<Clinic> {
  if (!isLive()) return demoStore().clinic
  const prisma = getPrisma()
  const user = await getSessionUser()
  if (!user) throw new Error('Unauthorized')
  const clinic = await prisma.clinic.findUnique({ where: { id: user.clinicId } })
  if (!clinic) throw new Error('Clinic not found')
  return {
    id: clinic.id,
    name: clinic.name,
    specialty: clinic.specialty,
    phone: clinic.phone,
    address: clinic.address,
    timezone: clinic.timezone,
    currency: clinic.currency,
  }
}

// ────────────────────────────────────────────────────────────────
// Patients
// ────────────────────────────────────────────────────────────────

function patientTrend(status: Patient['status']): { label: string; improving: boolean } {
  switch (status) {
    case 'IMPROVING':
    case 'RECOVERED':
      return { label: 'Improving', improving: true }
    case 'WORSENED':
      return { label: 'Worsened', improving: false }
    case 'NO_RESPONSE':
      return { label: 'No response', improving: false }
    default:
      return { label: 'Stable', improving: false }
  }
}

export interface PatientRow extends Patient {
  lastVisit?: string
  currentIssue?: string | null
  followUpDue?: string
  paymentPending?: number
}

export async function listPatientsWithMeta(): Promise<PatientRow[]> {
  if (!isLive()) {
    const store = demoStore()
    const rows: PatientRow[] = []
    for (const p of store.patients) {
      const cons = store.consultations.filter((c) => c.patientId === p.id).sort((a, b) => b.date.localeCompare(a.date))
      const fut = store.followUps
        .filter((f) => f.patientId === p.id && f.status !== 'COMPLETED' && f.status !== 'CANCELLED')
        .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))[0]
      const pending = store.payments.filter((pay) => pay.patientId === p.id && (pay.status === 'PENDING' || pay.status === 'PARTIAL' || pay.status === 'OVERDUE')).reduce((s, x) => s + x.amount, 0)
      rows.push({
        ...p,
        lastVisit: cons[0]?.date,
        currentIssue: cons[0]?.chiefComplaint ?? null,
        followUpDue: fut?.scheduledDate,
        paymentPending: pending,
      })
    }
    return rows
  }
  const prisma = getPrisma()
  const user = await requireSessionUser()
  const rows = await prisma.patient.findMany({
    where: { clinicId: user.clinicId },
    orderBy: { updatedAt: 'desc' },
    include: {
      consultations: { orderBy: { date: 'desc' }, take: 1, select: { date: true, chiefComplaint: true } },
      followUps: { where: { status: { in: ['OPEN', 'DUE', 'OVERDUE'] } }, orderBy: { scheduledDate: 'asc' }, take: 1, select: { scheduledDate: true } },
    },
  })
  const pending = await prisma.payment.groupBy({
    by: ['patientId'],
    where: { clinicId: user.clinicId, status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] } },
    _sum: { amount: true },
  })
  const pendingMap = new Map(pending.map((p) => [p.patientId, p._sum.amount ?? 0]))
  return rows.map((r) => ({
    id: r.id,
    patientCode: r.patientCode,
    clinicId: r.clinicId,
    firstName: r.firstName,
    lastName: r.lastName,
    dateOfBirth: r.dateOfBirth?.toISOString() ?? null,
    gender: r.gender,
    phone: r.phone,
    email: r.email,
    address: r.address,
    emergencyContact: r.emergencyContact,
    status: r.status as PatientStatus,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    lastVisit: r.consultations[0]?.date.toISOString(),
    currentIssue: r.consultations[0]?.chiefComplaint,
    followUpDue: r.followUps[0]?.scheduledDate.toISOString(),
    paymentPending: pendingMap.get(r.id) ?? 0,
  }))
}

export async function listPatients(): Promise<Patient[]> {
  if (!isLive()) {
    return [...demoStore().patients].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }
  const prisma = getPrisma()
  const user = await requireSessionUser()
  const rows = await prisma.patient.findMany({
    where: { clinicId: user.clinicId },
    orderBy: { updatedAt: 'desc' },
  })
  return rows.map((r) => ({
    id: r.id,
    patientCode: r.patientCode,
    clinicId: r.clinicId,
    firstName: r.firstName,
    lastName: r.lastName,
    dateOfBirth: r.dateOfBirth?.toISOString() ?? null,
    gender: r.gender,
    phone: r.phone,
    email: r.email,
    address: r.address,
    emergencyContact: r.emergencyContact,
    status: r.status as PatientStatus,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }))
}

export async function searchPatients(query: string): Promise<SearchResult[]> {
  const q = query.trim().toLowerCase()
  if (!q) return []
  if (!isLive()) {
    const store = demoStore()
    const matches = store.patients.filter(
      (p) =>
        p.firstName.toLowerCase().includes(q) ||
        p.lastName?.toLowerCase().includes(q) ||
        p.patientCode.toLowerCase().includes(q) ||
        p.phone?.includes(q) ||
        p.email?.toLowerCase().includes(q) ||
        store
          .consultations
          .filter((c) => c.patientId === p.id)
          .some((c) => c.chiefComplaint?.toLowerCase().includes(q))
    )
    return matches.map((p) => {
      const cons = store.consultations.filter((c) => c.patientId === p.id)
      const last = cons.sort((a, b) => b.date.localeCompare(a.date))[0]
      return {
        patient: p,
        lastVisit: last?.date ?? null,
        currentIssue: last?.chiefComplaint ?? null,
      }
    })
  }
  const prisma = getPrisma()
  const user = await requireSessionUser()
  const rows = await prisma.patient.findMany({
    where: {
      clinicId: user.clinicId,
      OR: [
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
        { patientCode: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q } },
        { email: { contains: q, mode: 'insensitive' } },
        { consultations: { some: { chiefComplaint: { contains: q, mode: 'insensitive' } } } },
      ],
    },
    include: { consultations: { orderBy: { date: 'desc' }, take: 1 } },
    take: 10,
  })
  return rows.map((r) => ({
    patient: {
      id: r.id,
      patientCode: r.patientCode,
      clinicId: r.clinicId,
      firstName: r.firstName,
      lastName: r.lastName,
      dateOfBirth: r.dateOfBirth?.toISOString() ?? null,
      gender: r.gender,
      phone: r.phone,
      email: r.email,
      status: r.status as PatientStatus,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    },
    lastVisit: r.consultations[0]?.date.toISOString() ?? null,
    currentIssue: r.consultations[0]?.chiefComplaint ?? null,
  }))
}

export async function getPatient(id: string): Promise<Patient | null> {
  if (!isLive()) {
    return demoStore().patients.find((p) => p.id === id) ?? null
  }
  const prisma = getPrisma()
  const user = await getSessionUser()
  if (!user) return null
  // Scoped by clinic: cross-clinic ids resolve to null (renders 404, never leaks).
  const row = await prisma.patient.findFirst({ where: { id, clinicId: user.clinicId } })
  if (!row) return null
  return {
    id: row.id,
    patientCode: row.patientCode,
    clinicId: row.clinicId,
    firstName: row.firstName,
    lastName: row.lastName,
    dateOfBirth: row.dateOfBirth?.toISOString() ?? null,
    gender: row.gender,
    phone: row.phone,
    email: row.email,
    address: row.address,
    emergencyContact: row.emergencyContact,
    bloodGroup: row.bloodGroup,
    status: row.status as PatientStatus,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export async function createPatient(input: NewPatientInput): Promise<Patient> {
  if (!isLive()) {
    const store = demoStore()
    const patient: Patient = {
      id: uid('pt'),
      patientCode: `P${Math.floor(10000 + Math.random() * 89999)}`,
      clinicId: store.clinic.id,
      firstName: input.firstName,
      lastName: input.lastName ?? null,
      dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth).toISOString() : null,
      gender: input.gender ?? null,
      phone: input.phone ?? null,
      email: input.email ?? null,
      address: input.address ?? null,
      emergencyContact: input.emergencyContact ?? null,
      status: 'NEW',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    store.patients.push(patient)
    return patient
  }
  const prisma = getPrisma()
  const user = await getSessionUser()
  if (!user) throw new Error('Unauthorized')
  const row = await prisma.patient.create({
    data: {
      patientCode: `P${Math.floor(10000 + Math.random() * 89999)}`,
      clinicId: user.clinicId,
      firstName: input.firstName,
      lastName: input.lastName,
      dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
      gender: input.gender,
      phone: input.phone,
      email: input.email,
      address: input.address,
      emergencyContact: input.emergencyContact,
    },
  })
  return (await getPatient(row.id))!
}

export async function updatePatientStatus(id: string, status: PatientStatus): Promise<Patient | null> {
  if (!isLive()) {
    const store = demoStore()
    const p = store.patients.find((x) => x.id === id)
    if (!p) return null
    p.status = status
    p.updatedAt = new Date().toISOString()
    return p
  }
  const prisma = getPrisma()
  const user = await requireSessionUser()
  const updated = await prisma.patient.updateMany({ where: { id, clinicId: user.clinicId }, data: { status } })
  if (updated.count === 0) return null
  return (await getPatient(id))!
}

// ────────────────────────────────────────────────────────────────
// Consultations + Timeline
// ────────────────────────────────────────────────────────────────

async function consultationsFor(patientId: string, clinicId?: string): Promise<Consultation[]> {
  if (!isLive()) {
    const store = demoStore()
    return store.consultations
      .filter((c) => c.patientId === patientId)
      .sort((a, b) => a.date.localeCompare(b.date))
  }
  const prisma = getPrisma()
  const rows = await prisma.consultation.findMany({
    where: { patientId, ...(clinicId ? { patient: { clinicId } } : {}) },
    orderBy: { date: 'asc' },
    include: {
      doctor: { select: { id: true, name: true } },
      symptoms: true,
      treatments: true,
      outcomes: true,
      followUps: true,
    },
  })
  return rows.map((r) => ({
    id: r.id,
    patientId: r.patientId,
    doctorId: r.doctorId,
    appointmentId: r.appointmentId,
    date: r.date.toISOString(),
    chiefComplaint: r.chiefComplaint,
    clinicalNotes: r.clinicalNotes,
    assessment: r.assessment,
    treatmentSummary: r.treatmentSummary,
    status: r.status,
    isAiGenerated: r.isAiGenerated,
    doctor: r.doctor,
    symptoms: r.symptoms.map((s) => ({ id: s.id, consultationId: s.consultationId, name: s.name, severity: s.severity, duration: s.duration, notes: s.notes })),
    treatments: r.treatments.map((t) => ({
      id: t.id,
      patientId: t.patientId,
      consultationId: t.consultationId,
      type: t.type,
      name: t.name,
      instructions: t.instructions,
      dosage: t.dosage,
      startDate: t.startDate?.toISOString() ?? null,
      endDate: t.endDate?.toISOString() ?? null,
      status: t.status,
      response: t.response,
      notes: t.notes,
      createdAt: t.createdAt.toISOString(),
    })),
    outcomes: r.outcomes.map((o) => ({ id: o.id, consultationId: o.consultationId, metric: o.metric, previousValue: o.previousValue, currentValue: o.currentValue, response: o.response, notes: o.notes })),
    followUps: r.followUps.map((f) => ({ id: f.id, patientId: f.patientId, consultationId: f.consultationId, scheduledDate: f.scheduledDate.toISOString(), reason: f.reason, status: f.status, reminderDays: f.reminderDays, completedAt: f.completedAt?.toISOString() ?? null })),
  }))
}

async function treatmentsFor(patientId: string, clinicId?: string): Promise<Treatment[]> {
  if (!isLive()) {
    const store = demoStore()
    return store.treatments.filter((t) => t.patientId === patientId)
  }
  const prisma = getPrisma()
  const rows = await prisma.treatment.findMany({ where: { patientId, ...(clinicId ? { patient: { clinicId } } : {}) }, orderBy: { createdAt: 'asc' } })
  return rows.map((t) => ({
    id: t.id,
    patientId: t.patientId,
    consultationId: t.consultationId,
    type: t.type,
    name: t.name,
    instructions: t.instructions,
    dosage: t.dosage,
    startDate: t.startDate?.toISOString() ?? null,
    endDate: t.endDate?.toISOString() ?? null,
    status: t.status,
    response: t.response,
    notes: t.notes,
    createdAt: t.createdAt.toISOString(),
  }))
}

async function paymentsFor(patientId: string, clinicId?: string): Promise<Payment[]> {
  if (!isLive()) {
    const store = demoStore()
    return store.payments.filter((p) => p.patientId === patientId)
  }
  const prisma = getPrisma()
  const rows = await prisma.payment.findMany({
    where: { patientId, ...(clinicId ? { patient: { clinicId } } : {}) },
    orderBy: { paymentDate: 'asc' },
  })
  return rows.map((p) => ({
    id: p.id,
    clinicId: p.clinicId,
    patientId: p.patientId,
    invoiceId: p.invoiceId,
    amount: p.amount,
    method: p.method,
    status: p.status,
    transactionReference: p.transactionReference,
    description: p.description,
    paymentDate: p.paymentDate.toISOString(),
  }))
}

export async function getPatientDetail(patientId: string): Promise<PatientDetail | null> {
  const patient = await getPatient(patientId)
  if (!patient) return null
  // getPatient is clinic-scoped, so patient.clinicId is trusted for the fan-out below.
  const [consultations, treatments, payments, appointments, followUps, measurements] = await Promise.all([
    consultationsFor(patientId, patient.clinicId),
    treatmentsFor(patientId, patient.clinicId),
    paymentsFor(patientId, patient.clinicId),
    appointmentsFor(patientId, patient.clinicId),
    followUpsFor(patientId, patient.clinicId),
    measurementsForDetail(patientId, patient.clinicId),
  ])
  const timeline = buildTimeline({ consultations, treatments, payments, appointments, followUps, measurements })
  return { patient, consultations, treatments, payments, appointments, followUps, timeline }
}

async function measurementsForDetail(patientId: string, clinicId?: string) {
  if (!isLive()) {
    const { measurementsForPatient } = await import('./demo-clinical')
    const store = demoStore() as unknown as { measurements?: { id: string; patientId: string; type: string; value: number; unit?: string | null; recordedAt: string; visitId?: string | null }[] }
    return [...measurementsForPatient(patientId), ...(store.measurements ?? []).filter((m) => m.patientId === patientId)]
  }
  const prisma = getPrisma()
  const rows = await prisma.measurement.findMany({ where: { patientId, ...(clinicId ? { clinicId } : {}) }, orderBy: { recordedAt: 'asc' } })
  return rows.map((r) => ({ id: r.id, patientId: r.patientId, type: r.type, value: r.value, unit: r.unit, recordedAt: r.recordedAt.toISOString(), visitId: r.visitId }))
}

export async function createConsultation(input: NewConsultationInput): Promise<Consultation> {
  if (!isLive()) {
    const store = demoStore()
    const c: Consultation = {
      id: uid('con'),
      patientId: input.patientId,
      doctorId: input.doctorId,
      appointmentId: null,
      date: input.date ?? new Date().toISOString(),
      chiefComplaint: input.chiefComplaint ?? null,
      clinicalNotes: input.clinicalNotes ?? null,
      assessment: input.assessment ?? null,
      treatmentSummary: input.treatments?.map((t) => t.name).join(', ') ?? null,
      status: 'COMPLETED',
      isAiGenerated: input.isAiGenerated ?? false,
      symptoms: (input.symptoms ?? []).map((s) => ({
        id: uid('sym'),
        consultationId: '',
        name: s.name,
        severity: (s.severity as Consultation['symptoms'][number]['severity']) ?? 'UNSPECIFIED',
        duration: s.duration ?? null,
        notes: null,
      })),
      treatments: (input.treatments ?? []).map((t) => ({
        id: uid('trt'),
        patientId: input.patientId,
        consultationId: '',
        type: t.type,
        name: t.name,
        instructions: t.instructions ?? null,
        dosage: t.dosage ?? null,
        startDate: null,
        endDate: null,
        status: 'PRESCRIBED',
        response: 'UNSET',
        notes: null,
        createdAt: new Date().toISOString(),
      })),
      outcomes: (input.outcomes ?? []).map((o) => ({
        id: uid('out'),
        consultationId: '',
        metric: o.metric,
        previousValue: o.previousValue ?? null,
        currentValue: o.currentValue ?? null,
        response: (o.response as Consultation['outcomes'][number]['response']) ?? 'STABLE',
        notes: null,
      })),
      followUps: input.followUp?.scheduledDate
        ? [
            {
              id: uid('fu'),
              patientId: input.patientId,
              consultationId: '',
              scheduledDate: new Date(input.followUp.scheduledDate).toISOString(),
              reason: input.followUp.reason ?? null,
              status: 'OPEN',
              reminderDays: 1,
              completedAt: null,
            },
          ]
        : [],
      doctor: { id: store.user.id, name: store.user.name },
    }
    // link child records
    for (const s of c.symptoms) s.consultationId = c.id
    for (const t of c.treatments) t.consultationId = c.id
    for (const o of c.outcomes) o.consultationId = c.id
    for (const f of c.followUps) f.consultationId = c.id
    store.consultations.push(c)
    store.treatments.push(...c.treatments)
    store.followUps.push(...c.followUps)

    // optionally record invoice + payment + ledger, then count the visit toward packages
    if (input.fee && input.fee > 0) {
      const { recordConsultationBilling } = await import('./billing')
      await recordConsultationBilling({
        patientId: input.patientId,
        consultationId: c.id,
        description: `Consultation · ${c.chiefComplaint ?? 'visit'}`,
        fee: input.fee,
        paidNow: input.paidNow,
        paymentStatus: input.paymentStatus ?? 'PENDING',
        paymentMethod: input.paymentMethod ?? 'CASH',
      })
    }
    const { markEnrollmentVisits } = await import('./billing')
    await markEnrollmentVisits(input.patientId)
    const p = store.patients.find((x) => x.id === input.patientId)
    if (p) {
      p.status = input.outcomes?.length
        ? input.outcomes.some((o) => o.response === 'WORSENED')
          ? 'WORSENED'
          : input.outcomes.every((o) => o.response === 'IMPROVED' || o.response === 'IMPROVING')
            ? 'IMPROVING'
            : 'ACTIVE'
        : p.status
      p.updatedAt = new Date().toISOString()
    }
    return c
  }
  const prisma = getPrisma()
  const user = await assertPatientInClinic(input.patientId)
  let outcomeIds: string[] = []
  const created = await prisma.consultation.create({
    data: {
      patientId: input.patientId,
      doctorId: user.id,
      date: input.date ? new Date(input.date) : new Date(),
      chiefComplaint: input.chiefComplaint,
      clinicalNotes: input.clinicalNotes,
      assessment: input.assessment,
      treatmentSummary: input.treatments?.map((t) => t.name).join(', ') ?? null,
      status: 'COMPLETED',
      isAiGenerated: input.isAiGenerated ?? false,
      symptoms: {
        create: (input.symptoms ?? []).map((s) => ({
          name: s.name,
          severity: s.severity as 'MILD' | 'MODERATE' | 'SEVERE' | 'UNSPECIFIED',
          duration: s.duration,
        })),
      },
      treatments: {
        create: (input.treatments ?? []).map((t) => ({
          patientId: input.patientId,
          type: t.type,
          name: t.name,
          instructions: t.instructions,
          dosage: t.dosage,
        })),
      },
      outcomes: {
        create: (input.outcomes ?? []).map((o) => ({
          metric: o.metric,
          previousValue: o.previousValue,
          currentValue: o.currentValue,
          response: o.response as 'IMPROVED' | 'STABLE' | 'NO_RESPONSE' | 'WORSENED',
        })),
      },
      followUps: input.followUp?.scheduledDate
        ? {
            create: {
              patientId: input.patientId,
              scheduledDate: new Date(input.followUp.scheduledDate),
              reason: input.followUp.reason,
              reminderDays: 1,
            },
          }
        : undefined,
    },
    include: {
      symptoms: true,
      treatments: true,
      outcomes: true,
      followUps: true,
    },
  })
  outcomeIds = created.outcomes.map((o) => o.id)
  if (input.fee && input.fee > 0) {
    const { recordConsultationBilling } = await import('./billing')
    await recordConsultationBilling({
      patientId: input.patientId,
      consultationId: created.id,
      description: `Consultation · ${input.chiefComplaint ?? 'visit'}`,
      fee: input.fee,
      paidNow: input.paidNow,
      paymentStatus: input.paymentStatus ?? 'PENDING',
      paymentMethod: input.paymentMethod ?? 'CASH',
    })
  }
  const { markEnrollmentVisits } = await import('./billing')
  await markEnrollmentVisits(input.patientId)
  if (input.outcomes?.length) {
    await prisma.patient.update({
      where: { id: input.patientId },
      data: {
        status: input.outcomes.some((o) => o.response === 'WORSENED')
          ? 'WORSENED'
          : input.outcomes.every((o) => ['IMPROVED', 'IMPROVING'].includes(o.response))
            ? 'IMPROVING'
            : 'ACTIVE',
      },
    })
  }
  void outcomeIds
  const cons = await consultationsFor(input.patientId, user.clinicId)
  return cons[cons.length - 1]
}

export async function updateTreatment(id: string, data: { status?: Treatment['status']; response?: Treatment['response']; notes?: string }): Promise<void> {
  if (!isLive()) {
    const store = demoStore()
    const t = store.treatments.find((x) => x.id === id)
    if (t) {
      if (data.status) t.status = data.status
      if (data.response) t.response = data.response
      if (data.notes !== undefined) t.notes = data.notes
    }
    return
  }
  const prisma = getPrisma()
  const user = await requireSessionUser()
  // Scoped update: a cross-clinic id matches zero rows instead of mutating.
  const updated = await prisma.treatment.updateMany({
    where: { id, patient: { clinicId: user.clinicId } },
    data: { status: data.status, response: data.response, notes: data.notes },
  })
  if (updated.count === 0) throw new Error('Treatment not found')
}

// ────────────────────────────────────────────────────────────────
// Appointments
// ────────────────────────────────────────────────────────────────

async function appointmentsFor(patientId: string, clinicId?: string): Promise<Appointment[]> {
  if (!isLive()) {
    const store = demoStore()
    return store.appointments.filter((a) => a.patientId === patientId)
  }
  const prisma = getPrisma()
  const rows = await prisma.appointment.findMany({
    where: { patientId, ...(clinicId ? { patient: { clinicId } } : {}) },
    include: appointmentInclude,
  })
  return rows.map(mapAppointment)
}

export async function listAppointments(filter?: { date?: string; status?: AppointmentStatus }): Promise<Appointment[]> {
  if (!isLive()) {
    const store = demoStore()
    let rows = [...store.appointments]
    if (filter?.date) {
      const day = new Date(filter.date).toDateString()
      rows = rows.filter((a) => new Date(a.date).toDateString() === day)
    }
    if (filter?.status) rows = rows.filter((a) => a.status === filter.status)
    return rows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }
  const prisma = getPrisma()
  const user = await requireSessionUser()
  const where: Record<string, unknown> = { clinicId: user.clinicId }
  if (filter?.date) {
    const start = new Date(filter.date)
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(end.getDate() + 1)
    where.date = { gte: start, lt: end }
  }
  if (filter?.status) where.status = filter.status
  const rows = await prisma.appointment.findMany({
    where,
    include: appointmentInclude,
    orderBy: { date: 'asc' },
  })
  return rows.map(mapAppointment)
}

export async function createAppointment(input: NewAppointmentInput): Promise<Appointment> {
  if (!isLive()) {
    const store = demoStore()
    const patient = store.patients.find((p) => p.id === input.patientId)
    const apt: Appointment = {
      id: uid('apt'),
      clinicId: store.clinic.id,
      patientId: input.patientId,
      doctorId: null,
      date: new Date(input.date).toISOString(),
      type: input.type ?? 'NEW_VISIT',
      status: 'SCHEDULED',
      reason: input.reason ?? null,
      notes: input.notes ?? null,
      queueNumber: store.appointments.length + 1,
      patient: patient && { id: patient.id, firstName: patient.firstName, lastName: patient.lastName, patientCode: patient.patientCode, phone: patient.phone ?? null },
    }
    store.appointments.push(apt)
    return apt
  }
  const prisma = getPrisma()
  const user = await assertPatientInClinic(input.patientId)
  const row = await prisma.appointment.create({
    data: {
      clinicId: user.clinicId,
      patientId: input.patientId,
      doctorId: user.id,
      date: new Date(input.date),
      type: input.type ?? 'NEW_VISIT',
      status: 'SCHEDULED',
      reason: input.reason,
      notes: input.notes,
    },
  })
  const created = await prisma.appointment.findFirst({
    where: { id: row.id, clinicId: user.clinicId },
    include: appointmentInclude,
  })
  return mapAppointment(created!)
}

export async function updateAppointmentStatus(id: string, status: AppointmentStatus): Promise<Appointment | null> {
  if (!isLive()) {
    const store = demoStore()
    const a = store.appointments.find((x) => x.id === id)
    if (!a) return null
    a.status = status
    return a
  }
  const prisma = getPrisma()
  const user = await requireSessionUser()
  // Scoped update: a cross-clinic id matches zero rows instead of mutating.
  const updated = await prisma.appointment.updateMany({ where: { id, clinicId: user.clinicId }, data: { status } })
  if (updated.count === 0) return null
  const row = await prisma.appointment.findFirst({
    where: { id, clinicId: user.clinicId },
    include: appointmentInclude,
  })
  return row ? mapAppointment(row) : null
}

export async function listAppointmentsByPatient(patientId: string): Promise<Appointment[]> {
  const user = await assertPatientInClinic(patientId)
  return appointmentsFor(patientId, user.clinicId)
}

// ────────────────────────────────────────────────────────────────
// Payments
// ────────────────────────────────────────────────────────────────

export async function listPayments(): Promise<Payment[]> {
  if (!isLive()) {
    const store = demoStore()
    return [...store.payments]
      .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
  }
  const prisma = getPrisma()
  const user = await requireSessionUser()
  const rows = await prisma.payment.findMany({
    where: { clinicId: user.clinicId },
    include: paymentInclude,
    orderBy: { paymentDate: 'desc' },
  })
  return rows.map(mapPayment)
}

export async function getPatientPayments(patientId: string): Promise<{ payments: Payment[]; summary: { totalCharges: number; paid: number; pending: number } }> {
  const user = isLive() ? await assertPatientInClinic(patientId) : null
  const payments = await paymentsFor(patientId, user?.clinicId)
  return {
    payments,
    summary: {
      totalCharges: payments.reduce((s, p) => s + (p.status === 'PENDING' || p.status === 'PAID' || p.status === 'PARTIAL' || p.status === 'OVERDUE' ? p.amount : 0), 0),
      paid: payments.filter((p) => p.status === 'PAID').reduce((s, p) => s + p.amount, 0),
      pending: payments.filter((p) => p.status === 'PENDING' || p.status === 'PARTIAL' || p.status === 'OVERDUE').reduce((s, p) => s + p.amount, 0),
    },
  }
}

export async function createPayment(input: NewPaymentInput): Promise<Payment> {
  if (!isLive()) {
    const store = demoStore()
    const pay: Payment = {
      id: uid('pay'),
      clinicId: store.clinic.id,
      patientId: input.patientId,
      amount: input.amount,
      method: input.method,
      status: input.status ?? 'PAID',
      description: input.description ?? 'Payment',
      paymentDate: input.date ? new Date(input.date).toISOString() : new Date().toISOString(),
      recordedByName: store.user.name,
    }
    store.payments.push(pay)
    return pay
  }
  const prisma = getPrisma()
  const user = await assertPatientInClinic(input.patientId)
  const row = await prisma.payment.create({
    data: {
      clinicId: user.clinicId,
      patientId: input.patientId,
      amount: input.amount,
      method: input.method,
      status: input.status ?? 'PAID',
      description: input.description,
      paymentDate: input.date ? new Date(input.date) : new Date(),
      recordedById: user.id,
    },
  })
  const created = await prisma.payment.findFirst({
    where: { id: row.id, clinicId: user.clinicId },
    include: paymentInclude,
  })
  return mapPayment(created!)
}

export async function getFinancialSummary(): Promise<FinancialSummary> {
  if (!isLive()) {
    const store = demoStore()
    const startToday = new Date()
    startToday.setHours(0, 0, 0, 0)
    const startMonth = new Date(startToday)
    startMonth.setDate(1)
    return {
      todayCollection: store.payments.filter((p) => p.status === 'PAID' && new Date(p.paymentDate) >= startToday).reduce((s, p) => s + p.amount, 0),
      pendingFees: store.payments.filter((p) => p.status === 'PENDING' || p.status === 'PARTIAL' || p.status === 'OVERDUE').reduce((s, p) => s + p.amount, 0),
      overdueFees: store.payments.filter((p) => (p.status === 'PENDING' || p.status === 'PARTIAL' || p.status === 'OVERDUE') && new Date(p.paymentDate) < startToday).reduce((s, p) => s + p.amount, 0),
      monthCollection: store.payments.filter((p) => p.status === 'PAID' && new Date(p.paymentDate) >= startMonth).reduce((s, p) => s + p.amount, 0),
    }
  }
  const prisma = getPrisma()
  const user = await getSessionUser()
  if (!user) throw new Error('Unauthorized')
  const startToday = new Date()
  startToday.setHours(0, 0, 0, 0)
  const startMonth = new Date(startToday)
  startMonth.setDate(1)
  const [today, pending, overdue, month] = await Promise.all([
    prisma.payment.aggregate({ where: { clinicId: user.clinicId, status: 'PAID', paymentDate: { gte: startToday } }, _sum: { amount: true } }),
    prisma.payment.aggregate({ where: { clinicId: user.clinicId, status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] } }, _sum: { amount: true } }),
    prisma.payment.aggregate({ where: { clinicId: user.clinicId, status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] }, paymentDate: { lt: startToday } }, _sum: { amount: true } }),
    prisma.payment.aggregate({ where: { clinicId: user.clinicId, status: 'PAID', paymentDate: { gte: startMonth } }, _sum: { amount: true } }),
  ])
  return {
    todayCollection: today._sum.amount ?? 0,
    pendingFees: pending._sum.amount ?? 0,
    overdueFees: overdue._sum.amount ?? 0,
    monthCollection: month._sum.amount ?? 0,
  }
}

// ────────────────────────────────────────────────────────────────
// Follow-ups
// ────────────────────────────────────────────────────────────────

async function followUpsFor(patientId: string, clinicId?: string): Promise<FollowUp[]> {
  if (!isLive()) {
    const store = demoStore()
    return store.followUps.filter((f) => f.patientId === patientId)
  }
  const prisma = getPrisma()
  const rows = await prisma.followUp.findMany({
    where: { patientId, ...(clinicId ? { patient: { clinicId } } : {}) },
    orderBy: { scheduledDate: 'asc' },
  })
  return rows.map(mapFollowUp)
}

export async function listFollowUps(): Promise<FollowUp[]> {
  if (!isLive()) {
    const store = demoStore()
    return [...store.followUps].sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
  }
  const prisma = getPrisma()
  const user = await requireSessionUser()
  const rows = await prisma.followUp.findMany({
    where: { patient: { clinicId: user.clinicId } },
    orderBy: { scheduledDate: 'asc' },
  })
  return rows.map(mapFollowUp)
}

export async function markFollowUp(id: string, status: FollowUp['status'] = 'COMPLETED'): Promise<FollowUp | null> {
  if (!isLive()) {
    const store = demoStore()
    const f = store.followUps.find((x) => x.id === id)
    if (!f) return null
    f.status = status
    f.completedAt = status === 'COMPLETED' ? new Date().toISOString() : null
    return f
  }
  const prisma = getPrisma()
  const user = await requireSessionUser()
  // Scoped update: a cross-clinic id matches zero rows instead of mutating.
  const updated = await prisma.followUp.updateMany({
    where: { id, patient: { clinicId: user.clinicId } },
    data: { status, completedAt: status === 'COMPLETED' ? new Date() : null },
  })
  if (updated.count === 0) return null
  const row = await prisma.followUp.findFirst({ where: { id, patient: { clinicId: user.clinicId } } })
  return row ? mapFollowUp(row) : null
}

// ────────────────────────────────────────────────────────────────
// Dashboard + Insights + Notifications
// ────────────────────────────────────────────────────────────────

/**
 * Derived outcome metrics (PRD §12) — real numbers, no illustrative baseline.
 * Demo mode computes from the seeded/runtime store; live resolves from Prisma.
 */
export async function getDashboardProgress(): Promise<DashboardProgress> {
  if (!isLive()) {
    const store = demoStore()
    const { carePlansForPatient } = await import('./demo-clinical')
    const improving = store.patients.filter((p) => p.status === 'IMPROVING' || p.status === 'RECOVERED').length
    const improvingPct = store.patients.length > 0 ? Math.round((improving / store.patients.length) * 100) : 0
    const completed = store.followUps.filter((f) => f.status === 'COMPLETED').length
    const followUpsCompletedPct = store.followUps.length > 0 ? Math.round((completed / store.followUps.length) * 100) : 0
    const plans = store.patients.flatMap((p) => carePlansForPatient(p.id))
    const items = plans.flatMap((pl) => pl.items)
    const done = items.filter((i) => i.done).length
    return {
      improvingPct,
      followUpsCompletedPct,
      careAdherencePct: items.length > 0 ? Math.round((done / items.length) * 100) : 0,
      totalPatients: store.patients.length,
      carePlanItemsDone: done,
      carePlanItemsTotal: items.length,
    }
  }
  const prisma = getPrisma()
  const user = await requireSessionUser()
  const clinicId = user.clinicId
  const [patientCount, improving, itemTotal, itemDone, followUpStats] = await Promise.all([
    prisma.patient.count({ where: { clinicId } }),
    prisma.patient.count({ where: { clinicId, status: { in: ['IMPROVING', 'RECOVERED'] } } }),
    prisma.carePlanItem.count({ where: { carePlan: { clinicId, status: 'ACTIVE' } } }),
    prisma.carePlanItem.count({ where: { carePlan: { clinicId, status: 'ACTIVE' }, done: true } }),
    prisma.followUp.groupBy({
      by: ['status'],
      where: { patient: { clinicId } },
      _count: { _all: true },
    }),
  ])
  const total = itemTotal
  const done = itemDone
  const followUpTotal = followUpStats.reduce((s, r) => s + r._count._all, 0)
  const followUpDone = followUpStats.find((r) => r.status === 'COMPLETED')?._count._all ?? 0
  return {
    improvingPct: patientCount > 0 ? Math.round((improving / patientCount) * 100) : 0,
    followUpsCompletedPct: followUpTotal > 0 ? Math.round((followUpDone / followUpTotal) * 100) : 0,
    careAdherencePct: total > 0 ? Math.round((done / total) * 100) : 0,
    totalPatients: patientCount,
    carePlanItemsDone: done,
    carePlanItemsTotal: total,
  }
}

export async function getDashboard(): Promise<DashboardData> {
  if (!isLive()) {
    const store = demoStore()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const queue = store.appointments
      .filter((a) => new Date(a.date) >= today)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((a) => ({ ...a, patient: store.patients.find((p) => p.id === a.patientId) ?? null }))
    return {
      kpis: getDemoKpis(),
      progress: await getDashboardProgress(),
      queue,
      attention: {
        overdueFollowUps: store.followUps.filter((f) => f.status === 'OVERDUE'),
        pendingPayments: store.payments.filter((p) => p.status === 'PENDING' || p.status === 'PARTIAL' || p.status === 'OVERDUE'),
        incompleteIntakes: store.patients.filter((p) => !p.phone).length,
      },
      notifications: demoNotifications.map((n) => ({ ...n })),
    }
  }
  const user = await requireSessionUser()
  const prisma = getPrisma()
  const clinicId = user.clinicId
  const startToday = new Date()
  startToday.setHours(0, 0, 0, 0)
  const endToday = new Date(startToday)
  endToday.setDate(endToday.getDate() + 1)
  const [kpis, queueRows, overdueRows, pendingRows, incompleteIntakes, notifications] = await Promise.all([
    getLiveDashboardKpis(),
    prisma.appointment.findMany({
      where: { clinicId, date: { gte: startToday, lt: endToday }, status: { notIn: ['CANCELLED', 'NO_SHOW'] } },
      include: appointmentInclude,
      orderBy: { date: 'asc' },
    }),
    prisma.followUp.findMany({
      where: { patient: { clinicId }, status: 'OVERDUE' },
      orderBy: { scheduledDate: 'asc' },
    }),
    prisma.payment.findMany({
      where: { clinicId, status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] } },
      include: paymentInclude,
      orderBy: { paymentDate: 'asc' },
    }),
    prisma.patient.count({ where: { clinicId, OR: [{ phone: null }, { phone: '' }] } }),
    listNotifications(),
  ])
  return {
    kpis,
    progress: await getDashboardProgress(),
    queue: queueRows.map(mapAppointment),
    attention: {
      overdueFollowUps: overdueRows.map(mapFollowUp),
      pendingPayments: pendingRows.map(mapPayment),
      incompleteIntakes,
    },
    notifications,
  }
}

async function getLiveDashboardKpis(): Promise<DashboardKpis> {
  const prisma = getPrisma()
  const user = await requireSessionUser()
  const clinicId = user.clinicId
  const startToday = new Date()
  startToday.setHours(0, 0, 0, 0)
  const scopedFollowUp = { patient: { clinicId } }
  const [todaysPatients, followUps, pendingFees, todaysCollection] = await Promise.all([
    prisma.appointment.count({ where: { clinicId, date: { gte: startToday }, status: { notIn: ['CANCELLED', 'NO_SHOW'] } } }),
    prisma.followUp.count({ where: { ...scopedFollowUp, status: { in: ['OPEN', 'DUE', 'OVERDUE'] } } }),
    prisma.payment.aggregate({ where: { clinicId, status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] } }, _sum: { amount: true } }),
    prisma.payment.aggregate({ where: { clinicId, status: 'PAID', paymentDate: { gte: startToday } }, _sum: { amount: true } }),
  ])
  const [overdueFollowUps, pendingPaymentsCount, incompleteIntakes, completed] = await Promise.all([
    prisma.followUp.count({ where: { ...scopedFollowUp, status: 'OVERDUE' } }),
    prisma.payment.count({ where: { clinicId, status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] } } }),
    prisma.patient.count({ where: { clinicId, OR: [{ phone: null }, { phone: '' }] } }),
    prisma.consultation.count({ where: { patient: { clinicId }, date: { gte: startToday } } }),
  ])
  return {
    todaysPatients,
    followUps,
    pendingFees: pendingFees._sum.amount ?? 0,
    todaysCollection: todaysCollection._sum.amount ?? 0,
    overdueFollowUps,
    pendingPayments: pendingPaymentsCount,
    incompleteIntakes,
    completedConsultations: completed,
  }
}

export async function getInsightsOverview(): Promise<InsightsOverview> {
  if (!isLive()) return getDemoInsights()
  const prisma = getPrisma()
  const user = await getSessionUser()
  if (!user) throw new Error('Unauthorized')
  const clinicId = user.clinicId
  const scopedChild = { patient: { clinicId } }
  const [totalPatients, consultations, revenueAgg, pendingAgg, followUpsDone, followUpsPending, noShowCount] = await Promise.all([
    prisma.patient.count({ where: { clinicId } }),
    prisma.consultation.count({ where: scopedChild }),
    prisma.payment.aggregate({ where: { clinicId, status: 'PAID' }, _sum: { amount: true } }),
    prisma.payment.aggregate({ where: { clinicId, status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] } }, _sum: { amount: true } }),
    prisma.followUp.count({ where: { ...scopedChild, status: 'COMPLETED' } }),
    prisma.followUp.count({ where: { ...scopedChild, status: { in: ['OPEN', 'DUE', 'OVERDUE'] } } }),
    prisma.appointment.count({ where: { clinicId, status: 'NO_SHOW' } }),
  ])
  const totalAppointments = await prisma.appointment.count({ where: { clinicId } })
  const revenue = revenueAgg._sum.amount ?? 0
  const pendingFees = pendingAgg._sum.amount ?? 0
  const totalFollowUps = followUpsDone + followUpsPending
  return {
    totalPatients,
    newPatients: await prisma.patient.count({ where: { clinicId, status: 'NEW' } }),
    returningPatients: await prisma.patient.count({ where: { clinicId, status: { not: 'NEW' } } }),
    consultations,
    treatmentsStarted: await prisma.treatment.count({ where: scopedChild }),
    followUpsCompleted: followUpsDone,
    pendingFollowUps: followUpsPending,
    revenue,
    avgConsultationValue: consultations > 0 ? Math.round(revenue / consultations) : 0,
    pendingFees,
    collectedFees: revenue,
    noShowRate: totalAppointments > 0 ? Math.round((noShowCount / totalAppointments) * 100) : 0,
    followUpRate: totalFollowUps > 0 ? Math.round((followUpsDone / totalFollowUps) * 100) : 0,
    monthlyRevenue: [],
  }
}

export async function listNotifications(): Promise<{ id: string; title: string; body: string | null; type: string; isRead: boolean; createdAt: string }[]> {
  if (!isLive()) {
    return demoNotifications.map((n, i) => ({ id: n.id, title: n.title, body: n.body, type: n.type, isRead: i === 0, createdAt: new Date().toISOString() }))
  }
  const prisma = getPrisma()
  const user = await requireSessionUser()
  const rows = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })
  return rows.map((n) => ({
    id: n.id,
    title: n.title,
    body: n.body,
    type: n.type,
    isRead: n.isRead,
    createdAt: n.createdAt.toISOString(),
  }))
}

export { patientTrend }