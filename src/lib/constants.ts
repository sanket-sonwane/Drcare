import type { AppointmentStatus, AppointmentType, PatientStatus, PaymentStatus, TreatmentResponse, TreatmentType, OverallResponse, FollowUpStatus } from '@/types'

export const ROUTES = {
  dashboard: '/dashboard',
  patients: '/patients',
  appointments: '/appointments',
  payments: '/payments',
  insights: '/insights',
  settings: '/settings',
} as const

export const SYMPTOM_OPTIONS = [
  'Pain',
  'Swelling',
  'Fever',
  'Weakness',
  'Stiffness',
  'Fatigue',
  'Nausea',
  'Headache',
  'Dizziness',
  'Breathlessness',
  'Cough',
  'Loss of appetite',
  'Insomnia',
  'Numbness',
  'Itching',
] as const

export const TREATMENT_TYPES: { value: TreatmentType; label: string }[] = [
  { value: 'MEDICATION', label: 'Medication' },
  { value: 'THERAPY', label: 'Therapy' },
  { value: 'EXERCISE', label: 'Exercise' },
  { value: 'PROCEDURE', label: 'Procedure' },
  { value: 'LIFESTYLE', label: 'Lifestyle' },
  { value: 'OTHER', label: 'Other' },
]

export const PAYMENT_METHODS: { value: string; label: string }[] = [
  { value: 'CASH', label: 'Cash' },
  { value: 'UPI', label: 'UPI' },
  { value: 'CARD', label: 'Card' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'OTHER', label: 'Other' },
]

export const APPOINTMENT_TYPES: { value: AppointmentType; label: string }[] = [
  { value: 'NEW_VISIT', label: 'New Visit' },
  { value: 'FOLLOW_UP', label: 'Follow-up' },
  { value: 'REVIEW', label: 'Review' },
  { value: 'CONSULTATION', label: 'Consultation' },
  { value: 'WALK_IN', label: 'Walk-In' },
]

export const APPOINTMENT_STATUS_LABEL: Record<AppointmentStatus, string> = {
  SCHEDULED: 'Scheduled',
  CHECKED_IN: 'Checked In',
  WAITING: 'Waiting',
  IN_CONSULTATION: 'In Consultation',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  NO_SHOW: 'No-show',
}

export const PATIENT_STATUS_LABEL: Record<PatientStatus, string> = {
  ACTIVE: 'Active',
  ARCHIVED: 'Archived',
  NEW: 'New',
  IMPROVING: 'Improving',
  NO_RESPONSE: 'No Response',
  WORSENED: 'Worsened',
  RECOVERED: 'Recovered',
}

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  PAID: 'Paid',
  PENDING: 'Pending',
  PARTIAL: 'Partially Paid',
  OVERDUE: 'Overdue',
  REFUNDED: 'Refunded',
  CANCELLED: 'Cancelled',
}

export const RESPONSE_LABEL: Record<TreatmentResponse | OverallResponse, string> = {
  UNSET: '—',
  IMPROVING: 'Improving',
  STABLE: 'Stable',
  NO_RESPONSE: 'No Response',
  WORSENED: 'Worsened',
  IMPROVED: 'Improved',
}

export const FOLLOWUP_STATUS_LABEL: Record<FollowUpStatus, string> = {
  OPEN: 'Open',
  DUE: 'Due',
  OVERDUE: 'Overdue',
  COMPLETED: 'Completed',
  MISSED: 'Missed',
  CANCELLED: 'Cancelled',
}

export const FOLLOWUP_STATUS_VARIANT: Record<FollowUpStatus, 'default' | 'secondary' | 'destructive' | 'warning' | 'success' | 'outline'> = {
  OPEN: 'secondary',
  DUE: 'warning',
  OVERDUE: 'destructive',
  COMPLETED: 'success',
  MISSED: 'destructive',
  CANCELLED: 'outline',
}

export const STATUS_VARIANT: Record<
  'DOCTOR' | 'RECEPTIONIST' | 'ADMIN',
  'default' | 'secondary' | 'destructive' | 'warning' | 'success' | 'outline'
> = {
  DOCTOR: 'default',
  RECEPTIONIST: 'secondary',
  ADMIN: 'warning',
}

// ── v2 Preventive / Metabolic / Lifestyle OS ──

export const CONDITION_OPTIONS = [
  'Hypertension',
  'Diabetes',
  'Obesity',
  'Thyroid',
  'PCOD / PCOS',
  'Joint / Arthritis',
  'Preventive Cardiology',
  'Dyslipidemia',
  'Prediabetes',
] as const

export const PATIENT_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'new', label: 'New' },
  { value: 'active', label: 'Active' },
  { value: 'followup', label: 'Follow-up Due' },
  { value: 'hypertension', label: 'Hypertension' },
  { value: 'diabetes', label: 'Diabetes' },
  { value: 'obesity', label: 'Obesity' },
  { value: 'thyroid', label: 'Thyroid' },
  { value: 'pcod', label: 'PCOD / PCOS' },
  { value: 'joint', label: 'Joint / Arthritis' },
  { value: 'cardio', label: 'Preventive Cardiology' },
  { value: 'payment', label: 'Payment Pending' },
  { value: 'archived', label: 'Archived' },
] as const

export const MEASUREMENT_META: Record<string, { label: string; unit: string; precision?: number }> = {
  weight: { label: 'Weight', unit: 'kg', precision: 1 },
  height: { label: 'Height', unit: 'cm', precision: 0 },
  bmi: { label: 'BMI', unit: '', precision: 1 },
  waist: { label: 'Waist', unit: 'cm', precision: 0 },
  bp_systolic: { label: 'BP Systolic', unit: 'mmHg', precision: 0 },
  bp_diastolic: { label: 'BP Diastolic', unit: 'mmHg', precision: 0 },
  heart_rate: { label: 'Heart Rate', unit: 'bpm', precision: 0 },
  fasting_glucose: { label: 'Fasting Glucose', unit: 'mg/dL', precision: 0 },
  postmeal_glucose: { label: 'Post-meal Glucose', unit: 'mg/dL', precision: 0 },
  hba1c: { label: 'HbA1c', unit: '%', precision: 1 },
  ldl: { label: 'LDL', unit: 'mg/dL', precision: 0 },
  hdl: { label: 'HDL', unit: 'mg/dL', precision: 0 },
  triglycerides: { label: 'Triglycerides', unit: 'mg/dL', precision: 0 },
  total_cholesterol: { label: 'Total Cholesterol', unit: 'mg/dL', precision: 0 },
  tsh: { label: 'TSH', unit: 'µIU/mL', precision: 2 },
  pain_score: { label: 'Pain Score', unit: '/10', precision: 0 },
}

export const CARDIO_SYMPTOMS = [
  'Fatigue',
  'Headache',
  'Dizziness',
  'Breathlessness',
  'Chest discomfort',
  'Palpitations',
  'Swelling',
  'Joint pain',
  'No major symptoms',
  'Other',
] as const

export const DIET_TAGS = [
  'Reduced refined carbs',
  'Portion control',
  'Increased vegetables',
  'Reduced sugary drinks',
  'Frequent eating out',
  'Late-night eating',
] as const

export const ACTIVITY_OPTIONS = ['Walking', 'Strength', 'Cycling', 'Yoga', 'Swimming'] as const

export const FEE_PRESETS_DEFAULT: { visitType: string; label: string; amount: number }[] = [
  { visitType: 'NEW_PATIENT', label: 'Initial Consultation', amount: 100000 },
  { visitType: 'HYPERTENSION', label: 'Hypertension Follow-up', amount: 60000 },
  { visitType: 'DIABETES', label: 'Diabetes Follow-up', amount: 60000 },
  { visitType: 'WEIGHT', label: 'Weight Management', amount: 70000 },
  { visitType: 'LIFESTYLE_REVIEW', label: 'Lifestyle Review', amount: 70000 },
  { visitType: 'PREVENTIVE_CARDIOLOGY', label: 'Preventive Assessment', amount: 150000 },
]

export const CARE_PLAN_PRESETS: { name: string; items: { category: string; title: string }[] }[] = [
  {
    name: 'Metabolic Lifestyle Plan',
    items: [
      { category: 'Activity', title: 'Walking 30 min/day' },
      { category: 'Activity', title: 'Strength training 2x/week' },
      { category: 'Nutrition', title: 'Portion control' },
      { category: 'Nutrition', title: 'Reduce refined carbohydrates' },
      { category: 'Sleep', title: 'Sleep 7–8 hours' },
      { category: 'Monitoring', title: 'Weekly weight tracking' },
    ],
  },
  {
    name: 'Hypertension Monitoring',
    items: [
      { category: 'Monitoring', title: 'Home BP monitoring' },
      { category: 'Nutrition', title: 'Reduce salt intake' },
      { category: 'Activity', title: 'Walking 30 min/day' },
    ],
  },
  {
    name: 'Diabetes Control',
    items: [
      { category: 'Monitoring', title: 'Fasting glucose twice/week' },
      { category: 'Nutrition', title: 'Reduce sugary drinks' },
      { category: 'Activity', title: 'Walking after meals' },
    ],
  },
]

export const FAVORITE_DEFAULTS = [
  'Walking 30 min/day',
  'Weight tracking',
  'Home BP monitoring',
  'Reduce refined carbohydrates',
  'Follow-up in 2 weeks',
] as const