import type { CarePlan, Measurement, PatientCondition } from '@/types'
import { uid } from './utils'
import { patients } from './demo-data'

function m(patientId: string, type: Measurement['type'], value: number, recordedAt: string, extra: Partial<Measurement> = {}): Measurement {
  return { id: uid('msr'), patientId, visitId: null, type, value, unit: null, recordedAt, source: 'CLINIC', ...extra }
}

function daysAgoISO(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

/** Metabolic demo series for Rahul Patil (P101) + others. */
export const demoMeasurements: Measurement[] = (() => {
  const rahul = patients[0]?.id ?? 'rahul'
  const out: Measurement[] = []
  // weight: 91.5 → 84.6
  ;[91.5, 89.8, 88.2, 86.1, 84.6].forEach((v, i) => {
    out.push(m(rahul, 'weight', v, daysAgoISO(60 - i * 14), { unit: 'kg' }))
  })
  // waist 107 → 99
  ;[107, 105, 103, 102, 99].forEach((v, i) => {
    out.push(m(rahul, 'waist', v, daysAgoISO(60 - i * 14), { unit: 'cm' }))
  })
  // BP
  ;[[142, 90], [140, 88], [138, 86], [136, 84], [132, 82]].forEach(([s, d], i) => {
    out.push(m(rahul, 'bp_systolic', s, daysAgoISO(60 - i * 14), { unit: 'mmHg' }))
    out.push(m(rahul, 'bp_diastolic', d, daysAgoISO(60 - i * 14), { unit: 'mmHg' }))
  })
  // HbA1c 7.1 → 6.2
  ;[7.1, 6.9, 6.7, 6.5, 6.2].forEach((v, i) => {
    out.push(m(rahul, 'hba1c', v, daysAgoISO(60 - i * 14), { unit: '%' }))
  })
  // lipids
  out.push(m(rahul, 'ldl', 128, daysAgoISO(60), { unit: 'mg/dL' }))
  out.push(m(rahul, 'ldl', 104, daysAgoISO(4), { unit: 'mg/dL' }))
  out.push(m(rahul, 'hdl', 42, daysAgoISO(60), { unit: 'mg/dL' }))
  out.push(m(rahul, 'hdl', 46, daysAgoISO(4), { unit: 'mg/dL' }))
  out.push(m(rahul, 'triglycerides', 188, daysAgoISO(60), { unit: 'mg/dL' }))
  out.push(m(rahul, 'triglycerides', 152, daysAgoISO(4), { unit: 'mg/dL' }))
  out.push(m(rahul, 'heart_rate', 78, daysAgoISO(4), { unit: 'bpm' }))
  out.push(m(rahul, 'fasting_glucose', 118, daysAgoISO(4), { unit: 'mg/dL' }))
  return out
})()

export const demoConditions: PatientCondition[] = (() => {
  const c = (idx: number, condition: string): PatientCondition => ({
    id: uid('cnd'), patientId: patients[idx]?.id ?? `p${idx}`, condition, status: 'ACTIVE',
  })
  return [
    c(0, 'Hypertension'), c(0, 'Diabetes'), c(0, 'Obesity'),
    c(1, 'Thyroid'), c(2, 'Joint / Arthritis'), c(3, 'PCOD / PCOS'),
    c(4, 'Hypertension'), c(5, 'Obesity'), c(6, 'Preventive Cardiology'),
    c(7, 'Diabetes'), c(8, 'Hypertension'), c(9, 'Thyroid'),
  ]
})()

export const demoCarePlans: CarePlan[] = (() => {
  const rahul = patients[0]?.id ?? 'rahul'
  return [
    {
      id: uid('cp'), patientId: rahul, name: 'Metabolic Lifestyle Plan', preset: 'Metabolic Lifestyle Plan',
      status: 'ACTIVE', nextReview: new Date(Date.now() + 14 * 864e5).toISOString(),
      items: [
        { id: uid('cpi'), carePlanId: '', category: 'Nutrition', title: 'Reduce refined carbohydrates', adherence: 'Good', done: true },
        { id: uid('cpi'), carePlanId: '', category: 'Activity', title: 'Walking 30 min/day', adherence: 'Good', done: true },
        { id: uid('cpi'), carePlanId: '', category: 'Sleep', title: 'Sleep 7–8 hours', adherence: 'Partial', done: false },
        { id: uid('cpi'), carePlanId: '', category: 'Monitoring', title: 'Home BP monitoring', adherence: 'Good', done: true },
        { id: uid('cpi'), carePlanId: '', category: 'Monitoring', title: 'Weekly weight tracking', adherence: 'Good', done: true },
      ],
    },
  ]
})()

export function measurementsForPatient(patientId: string): Measurement[] {
  return demoMeasurements.filter((x) => x.patientId === patientId)
}
export function conditionsForPatient(patientId: string): PatientCondition[] {
  return demoConditions.filter((x) => x.patientId === patientId)
}
export function carePlansForPatient(patientId: string): CarePlan[] {
  return demoCarePlans.filter((x) => x.patientId === patientId)
}
