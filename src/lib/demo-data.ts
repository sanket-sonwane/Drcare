import type {
  Appointment,
  Consultation,
  Clinic,
  FollowUp,
  Outcome,
  Payment,
  Patient,
  Symptom,
  Treatment,
  User,
  DashboardKpis,
  InsightsOverview,
  CarePackage,
  Invoice,
  LedgerEntry,
  PackageEnrollment,
  Refund,
} from '@/types'
import { uid } from './utils'
import { subDays, addDays, setHours, setMinutes, startOfDay } from 'date-fns'

function daysAgo(n: number, hour = 10, minute = 0) {
  return setMinutes(setHours(subDays(new Date(), n), hour), minute).toISOString()
}
function daysFromNow(n: number, hour = 10, minute = 0) {
  return setMinutes(setHours(addDays(new Date(), n), hour), minute).toISOString()
}
function laterToday(hour: number, minute: number) {
  return setMinutes(setHours(new Date(), hour), minute).toISOString()
}

// ────────────────────────────────────────────────────────────────
// Seeded static patient records (relative to "today" so the demo
// always looks alive)
// ────────────────────────────────────────────────────────────────

const CLINIC: Clinic = {
  id: 'clinic_demo',
  name: 'Sharma Ortho & Rehabilitation',
  specialty: 'Orthopaedics',
  phone: '+91 22 4004 5500',
  address: '12, Health Park, Andheri West, Mumbai',
  timezone: 'Asia/Kolkata',
  currency: 'INR',
}

const DOCTOR: User = {
  id: 'user_drsharma',
  clinicId: 'clinic_demo',
  name: 'Dr. Sharma',
  email: 'doctor@doctorcare.app',
  role: 'DOCTOR',
  specialty: 'Orthopaedic Surgeon',
}

const patientBase = (i: number, p: Partial<Patient>): Patient => ({
  id: uid('pt'),
  patientCode: `P10${i}`,
  clinicId: 'clinic_demo',
  firstName: '',
  lastName: null,
  dateOfBirth: null,
  gender: null,
  phone: null,
  email: null,
  createdAt: daysAgo(30 - i),
  updatedAt: daysAgo(1),
  status: 'ACTIVE',
  ...p,
})

export const patients: Patient[] = [
  patientBase(1, {
    firstName: 'Rahul',
    lastName: 'Patil',
    dateOfBirth: new Date(1994, 2, 14).toISOString(),
    gender: 'Male',
    phone: '+91 98200 12345',
    email: 'rahul.patil@gmail.com',
    address: '42, Green Meadows, Andheri West',
    emergencyContact: '+91 98200 99999',
    status: 'IMPROVING',
  }),
  patientBase(2, {
    firstName: 'Sneha',
    lastName: 'Joshi',
    dateOfBirth: new Date(1998, 6, 2).toISOString(),
    gender: 'Female',
    phone: '+91 98330 77851',
    email: 'sneha.joshi@outlook.com',
    status: 'ACTIVE',
  }),
  patientBase(3, {
    firstName: 'Amit',
    lastName: 'Shah',
    dateOfBirth: new Date(1987, 11, 25).toISOString(),
    gender: 'Male',
    phone: '+91 98765 43210',
    email: 'amit.shah@gmail.com',
    status: 'IMPROVING',
  }),
  patientBase(4, {
    firstName: 'Priya',
    lastName: 'Deshmukh',
    dateOfBirth: new Date(2001, 0, 9).toISOString(),
    gender: 'Female',
    phone: '+91 99870 11223',
    status: 'NEW',
  }),
  patientBase(5, {
    firstName: 'Vikram',
    lastName: 'Singh',
    dateOfBirth: new Date(1979, 4, 21).toISOString(),
    gender: 'Male',
    phone: '+91 99201 87765',
    status: 'NO_RESPONSE',
  }),
  patientBase(6, {
    firstName: 'Neha',
    lastName: 'Kulkarni',
    dateOfBirth: new Date(1992, 8, 17).toISOString(),
    gender: 'Female',
    phone: '+91 97654 32098',
    status: 'RECOVERED',
  }),
  patientBase(7, {
    firstName: 'Arjun',
    lastName: 'Nair',
    dateOfBirth: new Date(1984, 3, 3).toISOString(),
    gender: 'Male',
    phone: '+91 96990 56644',
    status: 'ACTIVE',
  }),
  patientBase(8, {
    firstName: 'Fatima',
    lastName: 'Sheikh',
    dateOfBirth: new Date(1995, 10, 30).toISOString(),
    gender: 'Female',
    phone: '+91 98985 32421',
    status: 'IMPROVING',
  }),
  patientBase(9, {
    firstName: 'Rohan',
    lastName: 'Verma',
    dateOfBirth: new Date(1975, 6, 12).toISOString(),
    gender: 'Male',
    phone: '+91 98110 47652',
    status: 'WORSENED',
  }),
  patientBase(10, {
    firstName: 'Kavita',
    lastName: 'Iyer',
    dateOfBirth: new Date(1990, 1, 28).toISOString(),
    gender: 'Female',
    phone: '+91 96199 22110',
    status: 'ACTIVE',
  }),
  patientBase(11, {
    firstName: 'Suresh',
    lastName: 'Gupta',
    dateOfBirth: new Date(1968, 5, 5).toISOString(),
    gender: 'Male',
    phone: '+91 98455 00987',
    status: 'NEW',
  }),
  patientBase(12, {
    firstName: 'Meera',
    lastName: 'Menon',
    dateOfBirth: new Date(1989, 9, 19).toISOString(),
    gender: 'Female',
    phone: '+91 97532 88910',
    status: 'ACTIVE',
  }),
]

function symptom(cId: string, name: string, severity: Symptom['severity'], duration?: string): Symptom {
  return { id: uid('sym'), consultationId: cId, name, severity, duration: duration ?? null, notes: null }
}

function outcome(cId: string, metric: string, prev: string, curr: string, response: Outcome['response']): Outcome {
  return {
    id: uid('out'),
    consultationId: cId,
    metric,
    previousValue: prev,
    currentValue: curr,
    response,
    notes: null,
  }
}

function followUp(pId: string, cId: string | null, date: string, reason: string, status: FollowUp['status'] = 'OPEN'): FollowUp {
  return {
    id: uid('fu'),
    patientId: pId,
    consultationId: cId,
    scheduledDate: date,
    reason,
    status,
    reminderDays: 1,
    completedAt: status === 'COMPLETED' ? daysAgo(0) : null,
  }
}

function treatment(
  pId: string,
  cId: string | null,
  kind: Treatment['type'],
  name: string,
  overrides: Partial<Treatment> = {}
): Treatment {
  return {
    id: uid('trt'),
    patientId: pId,
    consultationId: cId,
    type: kind,
    name,
    instructions: null,
    dosage: null,
    startDate: null,
    endDate: null,
    status: 'PRESCRIBED',
    response: 'UNSET',
    notes: null,
    createdAt: daysAgo(1),
    ...overrides,
  }
}

function consultation(
  pId: string,
  date: string,
  overrides: Partial<Consultation> & { symptoms: Symptom[]; treatments: Treatment[]; outcomes: Outcome[]; followUps: FollowUp[] }
): Consultation {
  return {
    id: uid('con'),
    patientId: pId,
    doctorId: DOCTOR.id,
    appointmentId: null,
    date,
    chiefComplaint: overrides.chiefComplaint ?? null,
    clinicalNotes: overrides.clinicalNotes ?? null,
    assessment: overrides.assessment ?? null,
    treatmentSummary: overrides.treatmentSummary ?? null,
    status: 'COMPLETED',
    isAiGenerated: false,
    symptoms: overrides.symptoms,
    treatments: overrides.treatments,
    outcomes: overrides.outcomes,
    followUps: overrides.followUps,
    doctor: { id: DOCTOR.id, name: DOCTOR.name },
  }
}

// ── Rahul Patil — the PRD's signature patient story ──
const rahulConsultations: Consultation[] = []
function seedRahul() {
  const rahul = patients[0]

  // Visit 3 (today, S8): follow-up — pain 2/10 improving
  const c3Trt = treatment(rahul.id, null, 'EXERCISE', 'Physiotherapy + Exercise', {
    status: 'ONGOING',
    response: 'IMPROVING',
    instructions: 'Continue as before, twice a week',
    startDate: daysAgo(4),
  })
  c3Trt.consultationId = null
  const c3 = consultation(rahul.id, daysAgo(0, 9, 30), {
    chiefComplaint: 'Follow-up — reduced pain, improved mobility',
    clinicalNotes: 'Patient reports pain much lower. Mobility improved noticeably. Continue with the current plan.',
    assessment: 'Muscle strain — resolving well',
    symptoms: [symptom('', 'Pain', 'MILD', 'Continuing')],
    treatments: [c3Trt],
    outcomes: [outcome('', 'Pain', '4/10', '2/10', 'IMPROVED'), outcome('', 'Mobility', 'Limited', 'Improved', 'IMPROVED')],
    followUps: [followUp(rahul.id, null, daysFromNow(7), 'Evaluate treatment response')],
  })
  c3.symptoms = [{ ...c3.symptoms[0], consultationId: c3.id }]
  c3.outcomes = c3.outcomes.map((o) => ({ ...o, consultationId: c3.id }))
  c3.followUps = c3.followUps.map((f) => ({ ...f, consultationId: c3.id }))
  c3Trt.consultationId = c3.id
  rahulConsultations.push(c3)

  // Visit 2 (S5): follow-up — pain 4/10, PT + Exercise
  const c2Trt = treatment(rahul.id, null, 'THERAPY', 'PT + Exercise', {
    status: 'ONGOING',
    response: 'IMPROVING',
    instructions: 'Twice weekly + daily home exercises',
    startDate: daysAgo(5),
  })
  const c2 = consultation(rahul.id, daysAgo(4, 10, 15), {
    chiefComplaint: 'Follow-up visit',
    clinicalNotes: 'Pain reduced to 4/10. Mobility limited but improving.',
    assessment: 'Muscle strain suspected — responding to treatment',
    symptoms: [symptom('', 'Pain', 'MODERATE', '6 days')],
    treatments: [c2Trt],
    outcomes: [outcome('', 'Pain', '7/10', '4/10', 'IMPROVED')],
    followUps: [],
  })
  c2.symptoms = [{ ...c2.symptoms[0], consultationId: c2.id }]
  c2.outcomes = c2.outcomes.map((o) => ({ ...o, consultationId: c2.id }))
  c2Trt.consultationId = c2.id
  rahulConsultations.push(c2)

  // Visit 1 (S2): initial — pain 7/10, medication + physiotherapy, X-ray
  const c1TrtA = treatment(rahul.id, null, 'MEDICATION', 'Medication', {
    instructions: 'NSAID — 3 days',
    status: 'COMPLETED',
    response: 'STABLE',
  })
  const c1TrtB = treatment(rahul.id, null, 'THERAPY', 'Physiotherapy', {
    status: 'COMPLETED',
    response: 'STABLE',
  })
  const c1 = consultation(rahul.id, daysAgo(7, 9, 0), {
    chiefComplaint: 'Lower back pain',
    clinicalNotes: 'Acute lower back pain after heavy lifting. Restricted mobility. X-Ray requested to rule out structural injury.',
    assessment: 'Muscle strain suspected',
    symptoms: [
      symptom('', 'Pain', 'SEVERE', '2 days'),
      symptom('', 'Stiffness', 'MODERATE', '2 days'),
    ],
    treatments: [c1TrtA, c1TrtB],
    outcomes: [outcome('', 'Pain', '—', '7/10', 'STABLE')],
    followUps: [],
  })
  c1.symptoms = c1.symptoms.map((s) => ({ ...s, consultationId: c1.id }))
  c1.outcomes = c1.outcomes.map((o) => ({ ...o, consultationId: c1.id }))
  c1TrtA.consultationId = c1.id
  c1TrtB.consultationId = c1.id
  rahulConsultations.push(c1)
}
seedRahul()

// ── Other patients — lighter histories ──
const otherHistories: Record<string, Consultation[]> = {}
const otherTreatments: Record<string, Treatment[]> = {}
function seedOthers() {
  const addHistory = (idx: number, days: number[], opts: { complaint: string; assessment: string; treatment: string }) => {
    const p = patients[idx]
    const cons: Consultation[] = []
    days.forEach((d, i) => {
      const t = treatment(p.id, null, 'MEDICATION', opts.treatment, {
        status: i === days.length - 1 ? 'ONGOING' : 'COMPLETED',
        response: 'IMPROVING',
      })
      const c = consultation(p.id, daysAgo(d, 10, 0), {
        chiefComplaint: opts.complaint,
        assessment: opts.assessment,
        symptoms: [symptom('', 'Pain', i === 0 ? 'SEVERE' : 'MODERATE')],
        treatments: [t],
        outcomes: [outcome('', 'Pain', '—', `${7 - i}/10`, 'IMPROVED')],
        followUps: [],
      })
      c.symptoms = c.symptoms.map((s) => ({ ...s, consultationId: c.id }))
      c.outcomes = c.outcomes.map((o) => ({ ...o, consultationId: c.id }))
      t.consultationId = c.id
      cons.push(c)
    })
    otherHistories[p.id] = cons
    otherTreatments[p.id] = cons.flatMap((c) => c.treatments)
  }

  addHistory(2, [2], { complaint: 'Knee pain while walking', assessment: 'Early OA changes', treatment: 'Knee exercises' })
  addHistory(3, [1], { complaint: 'Shoulder discomfort', assessment: 'Shoulder impingement', treatment: 'Therapy' })
  addHistory(4, [9, 3], { complaint: 'Chronic shoulder pain', assessment: 'Impingement syndrome', treatment: 'Physiotherapy' })
  addHistory(5, [12, 6], { complaint: 'Back stiffness', assessment: 'Lumbar spondylosis', treatment: 'Medication + PT' })
  addHistory(6, [15], { complaint: 'Ankle sprain', assessment: 'Ligament strain', treatment: 'RICE + Strapping' })
  addHistory(7, [20, 11], { complaint: 'Neck pain from desk work', assessment: 'Cervical strain', treatment: 'Posture + Exercise' })
  addHistory(8, [5], { complaint: 'Wrist pain', assessment: 'De Quervain tenosynovitis', treatment: 'Splint + Rest' })
  addHistory(9, [16, 2], { complaint: 'Hip pain', assessment: 'OA — review imaging', treatment: 'Medication' })
  addHistory(10, [8], { complaint: 'Foot pain', assessment: 'Plantar fasciitis', treatment: 'Stretching' })
}
seedOthers()

// Keep a flat struct for treatments across the store
export const treatments: Treatment[] = rahulConsultations.flatMap((c) => c.treatments)

// ── Appointments (today's queue + a few history rows) ──
export const appointments: Appointment[] = [
  {
    id: uid('apt'),
    clinicId: CLINIC.id,
    patientId: patients[0].id,
    date: laterToday(9, 30),
    type: 'FOLLOW_UP',
    status: 'WAITING',
    reason: 'Re-evaluate back pain',
    queueNumber: 1,
    patient: patients[0],
  },
  {
    id: uid('apt'),
    clinicId: CLINIC.id,
    patientId: patients[1].id,
    date: laterToday(10, 0),
    type: 'NEW_VISIT',
    status: 'SCHEDULED',
    reason: 'Neck stiffness',
    queueNumber: 2,
    patient: patients[1],
  },
  {
    id: uid('apt'),
    clinicId: CLINIC.id,
    patientId: patients[2].id,
    date: laterToday(10, 30),
    type: 'REVIEW',
    status: 'COMPLETED',
    reason: 'Knee pain review',
    queueNumber: 3,
    patient: patients[2],
  },
  {
    id: uid('apt'),
    clinicId: CLINIC.id,
    patientId: patients[4].id,
    date: laterToday(11, 0),
    type: 'FOLLOW_UP',
    status: 'IN_CONSULTATION',
    reason: 'Response check',
    queueNumber: 4,
    patient: patients[4],
  },
  {
    id: uid('apt'),
    clinicId: CLINIC.id,
    patientId: patients[5].id,
    date: laterToday(11, 30),
    type: 'WALK_IN',
    status: 'WAITING',
    reason: 'Sudden stiffness',
    queueNumber: 5,
    patient: patients[5],
  },
  {
    id: uid('apt'),
    clinicId: CLINIC.id,
    patientId: patients[7].id,
    date: laterToday(12, 0),
    type: 'FOLLOW_UP',
    status: 'SCHEDULED',
    reason: 'Progress review',
    queueNumber: 6,
    patient: patients[7],
  },
  {
    id: uid('apt'),
    clinicId: CLINIC.id,
    patientId: patients[9].id,
    date: daysAgo(1, 10, 0),
    type: 'FOLLOW_UP',
    status: 'NO_SHOW',
    patient: patients[9],
  },
  {
    id: uid('apt'),
    clinicId: CLINIC.id,
    patientId: patients[3].id,
    date: daysAgo(2, 10, 0),
    type: 'NEW_VISIT',
    status: 'COMPLETED',
    patient: patients[3],
  },
]

// ── Payments ──
export const payments: Payment[] = [
  {
    id: uid('pay'),
    clinicId: CLINIC.id,
    patientId: patients[0].id,
    amount: 50000,
    method: 'UPI',
    status: 'PAID',
    description: 'Consultation',
    paymentDate: daysAgo(7),
    recordedByName: DOCTOR.name,
  },
  {
    id: uid('pay'),
    clinicId: CLINIC.id,
    patientId: patients[0].id,
    amount: 150000,
    method: 'CASH',
    status: 'PAID',
    description: 'Treatment',
    paymentDate: daysAgo(4),
    recordedByName: DOCTOR.name,
  },
  {
    id: uid('pay'),
    clinicId: CLINIC.id,
    patientId: patients[0].id,
    amount: 80000,
    method: 'UPI',
    status: 'PENDING',
    description: 'Consultation',
    paymentDate: daysAgo(0),
    recordedByName: DOCTOR.name,
  },
  {
    id: uid('pay'),
    clinicId: CLINIC.id,
    patientId: patients[1].id,
    amount: 50000,
    method: 'UPI',
    status: 'PAID',
    description: 'Consultation',
    paymentDate: daysAgo(0),
    recordedByName: DOCTOR.name,
  },
  {
    id: uid('pay'),
    clinicId: CLINIC.id,
    patientId: patients[2].id,
    amount: 50000,
    method: 'CARD',
    status: 'PAID',
    description: 'Consultation',
    paymentDate: daysAgo(0),
    recordedByName: DOCTOR.name,
  },
  {
    id: uid('pay'),
    clinicId: CLINIC.id,
    patientId: patients[4].id,
    amount: 300000,
    method: 'BANK_TRANSFER',
    status: 'PENDING',
    description: 'Treatment package',
    paymentDate: daysAgo(3),
    recordedByName: DOCTOR.name,
  },
  {
    id: uid('pay'),
    clinicId: CLINIC.id,
    patientId: patients[9].id,
    amount: 50000,
    method: 'CASH',
    status: 'PENDING',
    description: 'Consultation',
    paymentDate: daysAgo(6),
    recordedByName: DOCTOR.name,
  },
  {
    id: uid('pay'),
    clinicId: CLINIC.id,
    patientId: patients[5].id,
    amount: 45000,
    method: 'CASH',
    status: 'PAID',
    description: 'Consultation',
    paymentDate: daysAgo(1),
    recordedByName: DOCTOR.name,
  },
  {
    id: uid('pay'),
    clinicId: CLINIC.id,
    patientId: patients[7].id,
    amount: 50000,
    method: 'UPI',
    status: 'PAID',
    description: 'Consultation',
    paymentDate: daysAgo(1),
    recordedByName: DOCTOR.name,
  },
]

// ── Follow-ups ──
export const followUps: FollowUp[] = [
  followUp(patients[0].id, null, daysFromNow(7), 'Evaluate treatment response', 'OPEN'),
  followUp(patients[1].id, null, daysFromNow(2), 'Neck stiffness review', 'DUE'),
  followUp(patients[2].id, null, daysFromNow(1), 'Knee pain follow-up', 'DUE'),
  followUp(patients[4].id, null, daysAgo(3), 'Shoulder progress missed', 'OVERDUE'),
  followUp(patients[7].id, null, daysAgo(1), 'Missed wrist check', 'OVERDUE'),
  followUp(patients[9].id, null, daysFromNow(4), 'Hip pain — continue medication', 'OPEN'),
  followUp(patients[5].id, null, daysFromNow(3), 'Bed rest follow-up', 'OPEN'),
  followUp(patients[3].id, null, daysAgo(0), 'Post consultation check', 'COMPLETED'),
]

// ── Notifications ──
export const notifications = [
  { id: 'n1', title: '4 follow-ups due today', body: 'Check the follow-up queue for details.', type: 'FOLLOW_UP' },
  { id: 'n2', title: 'Rahul Patil has an overdue payment', body: '₹800 pending from the latest consultation.', type: 'PAYMENT' },
  { id: 'n3', title: "Sneha Joshi's appointment starts in 15 minutes", body: '10:00 — Neck stiffness', type: 'APPOINTMENT' },
  { id: 'n4', title: '3 patients have incomplete records', body: 'Complete intake details to keep records accurate.', type: 'TASK' },
]

export const auditLogs = [
  { id: 'a1', action: 'Consultation created', entityType: 'Consultation', detail: 'Pain 7/10 → 4/10' },
  { id: 'a2', action: 'Treatment added', entityType: 'Treatment', detail: 'PT + Exercise' },
  { id: 'a3', action: 'Payment recorded', entityType: 'Payment', detail: '₹1,500 via cash' },
]

// ── Dashboard / attention helpers ─────────────────────────────────────

export function getDashboardKpis(): DashboardKpis {
  const today = startOfDay(new Date()).getTime()
  const todaysAppointments = appointments.filter(
    (a) => new Date(a.date).getTime() >= today && a.status !== 'CANCELLED' && a.status !== 'NO_SHOW'
  )
  const todaysCollection = payments
    .filter((p) => new Date(p.paymentDate).getTime() >= today && p.status === 'PAID')
    .reduce((s, p) => s + p.amount, 0)
  const pendingFees = payments.filter((p) => p.status === 'PENDING' || p.status === 'PARTIAL' || p.status === 'OVERDUE').reduce((s, p) => s + p.amount, 0)
  const overdueFollowUps = followUps.filter((f) => f.status === 'OVERDUE')
  return {
    todaysPatients: todaysAppointments.length,
    followUps: followUps.filter((f) => ['DUE', 'OVERDUE', 'OPEN'].includes(f.status)).length,
    pendingFees,
    todaysCollection,
    overdueFollowUps: overdueFollowUps.length,
    pendingPayments: payments.filter((p) => p.status === 'PENDING' || p.status === 'PARTIAL' || p.status === 'OVERDUE').length,
    incompleteIntakes: patients.filter((p) => !p.phone).length,
    completedConsultations: rahulConsultations.length + 8,
  }
}

export function getInsights(): InsightsOverview {
  const revenue = payments.filter((p) => p.status === 'PAID').reduce((s, p) => s + p.amount, 0)
  const pendingFees = payments.filter((p) => p.status === 'PENDING' || p.status === 'PARTIAL' || p.status === 'OVERDUE').reduce((s, p) => s + p.amount, 0)
  const totalConsultations = rahulConsultations.length + 8
  const completed = followUps.filter((f) => f.status === 'COMPLETED').length
  const missed = appointments.filter((a) => a.status === 'NO_SHOW').length
  return {
    totalPatients: patients.length,
    newPatients: patients.filter((p) => p.status === 'NEW').length,
    returningPatients: patients.filter((p) => p.status !== 'NEW').length,
    consultations: totalConsultations,
    treatmentsStarted: treatments.length + 6,
    followUpsCompleted: completed,
    pendingFollowUps: followUps.filter((f) => f.status !== 'COMPLETED' && f.status !== 'CANCELLED').length,
    revenue,
    avgConsultationValue: revenue / totalConsultations,
    pendingFees,
    collectedFees: revenue,
    noShowRate: Math.round((missed / appointments.length) * 100),
    followUpRate: Math.round((completed / followUps.length) * 100),
    monthlyRevenue: [
      { month: 'Apr', revenue: 1280000 },
      { month: 'May', revenue: 1420000 },
      { month: 'Jun', revenue: 1360000 },
      { month: 'Jul', revenue: 1550000 },
      { month: 'Aug', revenue: 1490000 },
      { month: 'Sep', revenue: 950000 },
    ],
  }
}

export const demoConsultationsByPatient: Record<string, Consultation[]> = Object.fromEntries(
  patients.map((p) => [p.id, p.id === patients[0].id ? rahulConsultations : otherHistories[p.id] ?? []])
)

export const demoTreatmentsByPatient: Record<string, Treatment[]> = Object.fromEntries(
  patients.map((p) => [p.id, p.id === patients[0].id ? rahulConsultations.flatMap((c) => c.treatments) : otherTreatments[p.id] ?? []])
)

export const demoFollowUpsByPatient: Record<string, FollowUp[]> = Object.fromEntries(
  patients.map((p) => [p.id, followUps.filter((f) => f.patientId === p.id)])
)

export const demoPaymentsByPatient: Record<string, Payment[]> = Object.fromEntries(
  patients.map((p) => [p.id, payments.filter((pay) => pay.patientId === p.id)])
)

export const demoAppointmentsByPatient: Record<string, Appointment[]> = Object.fromEntries(
  patients.map((p) => [p.id, appointments.filter((a) => a.patientId === p.id)])
)

// ── Invoices / Ledger / Care packages (v2 billing seed) ─────────────

function seedInvoices(): Invoice[] {
  const rahul = patients[0]
  const out: Invoice[] = []
  const mk = (n: number, patientId: string, consultationId: string | null, desc: string, fee: number, paid: number, days: number): Invoice => ({
    id: uid('inv'),
    invoiceNo: `INV-${1000 + n}`,
    patientId,
    consultationId,
    subtotal: fee,
    discount: 0,
    totalAmount: fee,
    paidAmount: paid,
    status: paid >= fee ? 'PAID' : paid > 0 ? 'PARTIAL' : 'PENDING',
    issuedAt: daysAgo(days),
    dueDate: paid < fee ? new Date(Date.now() + 7 * 864e5).toISOString() : null,
    lineItems: [{ description: desc, amount: fee, quantity: 1 }],
  })
  out.push(mk(1, rahul.id, rahulConsultations[0]?.id ?? null, 'Consultation — Lower back pain', 50000, 50000, 7))
  out.push(mk(2, rahul.id, rahulConsultations[1]?.id ?? null, 'Treatment — PT + Exercise', 150000, 150000, 4))
  out.push(mk(3, rahul.id, rahulConsultations[2]?.id ?? null, 'Consultation — Follow-up', 80000, 0, 0))
  out.push(mk(4, patients[1].id, null, 'Consultation — Neck stiffness', 50000, 50000, 0))
  out.push(mk(5, patients[2].id, null, 'Consultation — Knee pain review', 50000, 50000, 0))
  out.push(mk(6, patients[9].id, null, 'Consultation — Hip pain', 50000, 0, 6))
  return out
}

function seedLedger(invoices: Invoice[]): LedgerEntry[] {
  const entries: LedgerEntry[] = []
  for (const inv of invoices) {
    entries.push({ id: uid('led'), clinicId: CLINIC.id, patientId: inv.patientId, kind: 'CHARGE', amount: inv.totalAmount, reference: inv.invoiceNo, invoiceId: inv.id, description: inv.lineItems[0]?.description ?? 'Consultation', createdAt: inv.issuedAt })
    if (inv.paidAmount > 0) {
      const prefix = inv.lineItems[0]?.description.slice(0, 11) ?? ''
      const pay = payments.find(
        (p) => p.patientId === inv.patientId && p.status === 'PAID' && (p.description ?? '').startsWith(prefix)
      )
      entries.push({ id: uid('led'), clinicId: CLINIC.id, patientId: inv.patientId, kind: 'PAYMENT', amount: -inv.paidAmount, reference: inv.invoiceNo, invoiceId: inv.id, paymentId: pay?.id ?? null, description: `${inv.lineItems[0]?.description ?? 'Payment'} — received`, createdAt: inv.issuedAt })
    }
  }
  return entries
}

export const carePackages: CarePackage[] = [
  {
    id: uid('pkg'),
    name: '12-Week Metabolic Program',
    description: 'Weekly metabolic + lifestyle reviews with structured check-ins across 12 weeks.',
    price: 1200000,
    visitCount: 6,
  },
  {
    id: uid('pkg'),
    name: 'Hypertension Monitoring Pack',
    description: 'Monthly BP + risk reviews for 3 months with home-monitoring guidance.',
    price: 600000,
    visitCount: 3,
  },
]

function seedEnrollments(): PackageEnrollment[] {
  return [
    {
      id: uid('pen'),
      packageId: carePackages[0].id,
      patientId: patients[0].id,
      price: 1200000,
      paidAmount: 800000,
      visitsCompleted: 3,
      status: 'ACTIVE',
    },
  ]
}

// ── Runtime store (mutations persist only for the live session) ──────
const store: {
  patients: Patient[]
  consultations: Consultation[]
  appointments: Appointment[]
  payments: Payment[]
  followUps: FollowUp[]
  treatments: Treatment[]
  measurements?: { id: string; patientId: string; type: string; value: number; unit?: string | null; recordedAt: string; visitId?: string | null }[]
  conditions?: { id: string; patientId: string; condition: string; status: string; diagnosedAt?: string | null; notes?: string | null }[]
  invoices?: Invoice[]
  ledgerEntries?: LedgerEntry[]
  refunds?: Refund[]
  carePackages?: CarePackage[]
  packageEnrollments?: PackageEnrollment[]
  clinic: Clinic
  user: User
} = (() => {
  const invoices = seedInvoices()
  return {
    patients: [...patients],
    consultations: Object.values(demoConsultationsByPatient).flatMap((c) => c),
    appointments: [...appointments],
    payments: [...payments],
    followUps: [...followUps],
    // NOTE: demoTreatmentsByPatient already includes Rahul's treatments —
    // spreading `treatments` again would duplicate keys (React key collision).
    treatments: [...Object.values(demoTreatmentsByPatient).flat()],
    invoices,
    ledgerEntries: seedLedger(invoices),
    carePackages: [...carePackages],
    packageEnrollments: seedEnrollments(),
    clinic: CLINIC,
    user: DOCTOR,
  }
})()

export function getDemoStore() {
  return store
}

export function resetDemoStore() {
  const invoices = seedInvoices()
  store.patients = [...patients]
  store.consultations = Object.values(demoConsultationsByPatient).flatMap((c) => c)
  store.appointments = [...appointments]
  store.payments = [...payments]
  store.followUps = [...followUps]
  store.treatments = [...Object.values(demoTreatmentsByPatient).flat()]
  store.measurements = []
  store.conditions = []
  store.invoices = invoices
  store.ledgerEntries = seedLedger(invoices)
  store.refunds = []
  store.carePackages = [...carePackages]
  store.packageEnrollments = seedEnrollments()
}