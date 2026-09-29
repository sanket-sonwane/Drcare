// DoctorCare domain types — shared across demo + live data layers and pages.

export type Role = 'DOCTOR' | 'RECEPTIONIST' | 'ADMIN'
export type PatientStatus =
  | 'ACTIVE'
  | 'ARCHIVED'
  | 'NEW'
  | 'IMPROVING'
  | 'NO_RESPONSE'
  | 'WORSENED'
  | 'RECOVERED'

export type AppointmentType = 'NEW_VISIT' | 'FOLLOW_UP' | 'REVIEW' | 'CONSULTATION' | 'WALK_IN'
export type AppointmentStatus =
  | 'SCHEDULED'
  | 'CHECKED_IN'
  | 'WAITING'
  | 'IN_CONSULTATION'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW'

export type ConsultationStatus = 'DRAFT' | 'COMPLETED' | 'AI_REVIEW'
export type TreatmentType = 'MEDICATION' | 'THERAPY' | 'EXERCISE' | 'PROCEDURE' | 'LIFESTYLE' | 'OTHER'
export type TreatmentStatus = 'PRESCRIBED' | 'ONGOING' | 'COMPLETED' | 'DISCONTINUED'
export type TreatmentResponse = 'UNSET' | 'IMPROVING' | 'STABLE' | 'NO_RESPONSE' | 'WORSENED'
export type OverallResponse = 'IMPROVED' | 'STABLE' | 'NO_RESPONSE' | 'WORSENED'
export type FollowUpStatus = 'OPEN' | 'DUE' | 'OVERDUE' | 'COMPLETED' | 'MISSED' | 'CANCELLED'
export type PaymentMethod = 'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER' | 'OTHER'
export type PaymentStatus = 'PAID' | 'PENDING' | 'PARTIAL' | 'OVERDUE' | 'REFUNDED' | 'CANCELLED'
export type DocumentType = 'LAB_REPORT' | 'IMAGING_REPORT' | 'REFERRAL' | 'PRESCRIPTION' | 'SCAN' | 'OTHER'

// ── v2 Preventive / Metabolic / Lifestyle OS ──

export type ConditionKey =
  | 'Hypertension'
  | 'Diabetes'
  | 'Obesity'
  | 'Thyroid'
  | 'PCOD / PCOS'
  | 'Joint / Arthritis'
  | 'Preventive Cardiology'
  | 'Dyslipidemia'
  | 'Prediabetes'

export type MeasurementType =
  | 'weight'
  | 'height'
  | 'bmi'
  | 'waist'
  | 'bp_systolic'
  | 'bp_diastolic'
  | 'heart_rate'
  | 'fasting_glucose'
  | 'postmeal_glucose'
  | 'hba1c'
  | 'ldl'
  | 'hdl'
  | 'triglycerides'
  | 'total_cholesterol'
  | 'tsh'
  | 't3'
  | 't4'
  | 'pain_score'

export interface Measurement {
  id: string
  patientId: string
  visitId?: string | null
  type: MeasurementType | string
  value: number
  valueText?: string | null
  unit?: string | null
  recordedAt: string
  source?: string | null
  notes?: string | null
}

export interface PatientCondition {
  id: string
  patientId: string
  condition: string
  status: string
  diagnosedAt?: string | null
  notes?: string | null
}

export type LifestyleRating = 'Poor' | 'Fair' | 'Good' | 'Excellent' | 'Low' | 'Moderate' | 'High' | 'None' | 'Partial'

export interface LifestyleEntry {
  id: string
  patientId?: string
  consultationId?: string | null
  category: string
  rating?: string | null
  tags: string[]
  notes?: string | null
  recordedAt?: string
}

export interface CarePlanItem {
  id: string
  carePlanId: string
  category: string
  title: string
  detail?: string | null
  adherence?: string | null
  isFavorite?: boolean
  done: boolean
}

export interface CarePlan {
  id: string
  patientId: string
  consultationId?: string | null
  name: string
  preset?: string | null
  status: string
  nextReview?: string | null
  items: CarePlanItem[]
  createdAt?: string
}

export type VisitTypeKey =
  | 'NEW_PATIENT'
  | 'PREVENTIVE_CARDIOLOGY'
  | 'HYPERTENSION'
  | 'DIABETES'
  | 'WEIGHT'
  | 'THYROID'
  | 'PCOD'
  | 'JOINT'
  | 'LIFESTYLE_REVIEW'
  | 'CUSTOM'

export interface VisitFieldDef {
  key: string
  label: string
  type: 'number' | 'bp' | 'chips' | 'segmented' | 'multiselect' | 'toggle' | 'slider' | 'text' | 'date' | 'tags'
  unit?: string
  options?: string[]
  min?: number
  max?: number
  required?: boolean
  measurement?: MeasurementType | string
  placeholder?: string
}

export interface VisitSectionDef {
  key: string
  title: string
  fields: VisitFieldDef[]
}

export interface VisitTemplateDef {
  key: VisitTypeKey
  name: string
  specialty?: string
  defaultFee: number // minor units
  sections: VisitSectionDef[]
}

export interface FeePreset {
  id: string
  visitType: string
  label: string
  amount: number
}

export interface PaymentSplit {
  method: PaymentMethod
  amount: number
}

export type LedgerKind = 'CHARGE' | 'PAYMENT' | 'DISCOUNT' | 'REFUND' | 'CREDIT'

export interface LedgerEntry {
  id: string
  clinicId: string
  patientId: string
  kind: LedgerKind
  amount: number // signed: CHARGE +, PAYMENT/REFUND −
  reference?: string | null
  invoiceId?: string | null
  paymentId?: string | null
  description?: string | null
  createdAt: string
}

export interface Refund {
  id: string
  clinicId: string
  paymentId: string
  amount: number
  reason?: string | null
  createdBy?: string | null
  createdAt: string
}

export interface CarePackage {
  id: string
  name: string
  description?: string | null
  price: number
  visitCount: number
}

export interface PackageEnrollment {
  id: string
  packageId: string
  patientId: string
  price: number
  paidAmount: number
  visitsCompleted: number
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
  package?: CarePackage | null
  patient?: Pick<Patient, 'id' | 'firstName' | 'lastName' | 'patientCode'> | null
}

export interface Clinic {
  id: string
  name: string
  specialty?: string | null
  phone?: string | null
  address?: string | null
  timezone: string
  currency: string
}

export interface User {
  id: string
  clinicId: string
  name: string
  email: string
  role: Role
  specialty?: string | null
  phone?: string | null
  avatarUrl?: string | null
}

export interface Patient {
  id: string
  patientCode: string
  clinicId: string
  firstName: string
  lastName?: string | null
  dateOfBirth?: string | null // ISO date
  gender?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  emergencyContact?: string | null
  bloodGroup?: string | null
  status: PatientStatus
  notes?: string | null
  createdAt: string
  updatedAt: string
}

export interface Consultation {
  id: string
  patientId: string
  doctorId: string
  appointmentId?: string | null
  date: string
  chiefComplaint?: string | null
  clinicalNotes?: string | null
  assessment?: string | null
  treatmentSummary?: string | null
  status: ConsultationStatus
  isAiGenerated: boolean
  symptoms: Symptom[]
  treatments: Treatment[]
  outcomes: Outcome[]
  followUps: FollowUp[]
  doctor?: Pick<User, 'id' | 'name'> | null
}

export interface Symptom {
  id: string
  consultationId: string
  name: string
  severity: 'MILD' | 'MODERATE' | 'SEVERE' | 'UNSPECIFIED'
  duration?: string | null
  notes?: string | null
}

export interface Treatment {
  id: string
  patientId: string
  consultationId?: string | null
  type: TreatmentType
  name: string
  instructions?: string | null
  dosage?: string | null
  startDate?: string | null
  endDate?: string | null
  status: TreatmentStatus
  response: TreatmentResponse
  notes?: string | null
  createdAt: string
}

export interface Outcome {
  id: string
  consultationId: string
  metric: string
  previousValue?: string | null
  currentValue?: string | null
  response: OverallResponse
  notes?: string | null
}

export interface FollowUp {
  id: string
  patientId: string
  consultationId?: string | null
  scheduledDate: string
  reason?: string | null
  status: FollowUpStatus
  reminderDays: number
  completedAt?: string | null
}

export interface Appointment {
  id: string
  clinicId: string
  patientId: string
  doctorId?: string | null
  date: string
  type: AppointmentType
  status: AppointmentStatus
  reason?: string | null
  notes?: string | null
  queueNumber?: number | null
  patient?: Pick<Patient, 'id' | 'firstName' | 'lastName' | 'patientCode' | 'phone'> | null
  doctor?: Pick<User, 'id' | 'name'> | null
}

export interface Payment {
  id: string
  clinicId: string
  patientId: string
  invoiceId?: string | null
  consultationId?: string | null
  amount: number // minor units
  method: PaymentMethod
  status: PaymentStatus
  transactionReference?: string | null
  description?: string | null
  paymentDate: string
  dueDate?: string | null
  recordedByName?: string | null
  patient?: Pick<Patient, 'id' | 'firstName' | 'lastName' | 'patientCode'> | null
  splits?: PaymentSplit[]
}

export interface Invoice {
  id: string
  invoiceNo: string
  patientId: string
  consultationId?: string | null
  subtotal: number
  discount: number
  totalAmount: number
  paidAmount: number
  status: PaymentStatus
  issuedAt: string
  dueDate?: string | null
  patient?: Pick<Patient, 'id' | 'firstName' | 'lastName' | 'patientCode'> | null
  lineItems: { description: string; amount: number; quantity: number }[]
}

export interface DashboardKpis {
  todaysPatients: number
  followUps: number
  pendingFees: number
  todaysCollection: number
  overdueFollowUps: number
  pendingPayments: number
  incompleteIntakes: number
  completedConsultations: number
}

export interface DashboardProgress {
  improvingPct: number
  followUpsCompletedPct: number
  careAdherencePct: number
  totalPatients: number
  carePlanItemsDone: number
  carePlanItemsTotal: number
}

export interface InsightsOverview {
  totalPatients: number
  newPatients: number
  returningPatients: number
  consultations: number
  treatmentsStarted: number
  followUpsCompleted: number
  pendingFollowUps: number
  revenue: number
  avgConsultationValue: number
  pendingFees: number
  collectedFees: number
  noShowRate: number
  followUpRate: number
  monthlyRevenue: { month: string; revenue: number }[]
}

export interface SearchResult {
  patient: Patient
  lastVisit?: string | null
  currentIssue?: string | null
}