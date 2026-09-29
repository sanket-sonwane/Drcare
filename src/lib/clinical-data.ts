import { isLive, getPrisma } from './db'
import { getDemoStore } from './demo-data'
import { uid } from './utils'
import { measurementsForPatient, conditionsForPatient, carePlansForPatient, demoConditions } from './demo-clinical'
import type { CarePlan, Measurement, PatientCondition } from '@/types'

export async function getMeasurements(patientId: string): Promise<Measurement[]> {
  if (!isLive()) {
    // merge persisted session measurements stored on global demo store
    const store = getDemoStore() as unknown as { measurements?: Measurement[] }
    const extra = (store.measurements ?? []).filter((m) => m.patientId === patientId)
    return [...measurementsForPatient(patientId), ...extra].sort(
      (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
    )
  }
  const prisma = getPrisma()
  const rows = await prisma.measurement.findMany({ where: { patientId }, orderBy: { recordedAt: 'asc' } })
  return rows.map((r) => ({
    id: r.id, patientId: r.patientId, visitId: r.visitId, type: r.type, value: r.value,
    valueText: r.valueText, unit: r.unit, recordedAt: r.recordedAt.toISOString(), source: r.source, notes: r.notes,
  }))
}

export async function getConditions(patientId: string): Promise<PatientCondition[]> {
  if (!isLive()) {
    const store = getDemoStore() as unknown as { conditions?: PatientCondition[] }
    // runtime edits override the scaffold: if any condition was toggled for
    // this patient, the store slice is authoritative — otherwise seed.
    const extra = (store.conditions ?? []).filter((c) => c.patientId === patientId)
    if (extra.length) return extra
    return conditionsForPatient(patientId)
  }
  const prisma = getPrisma()
  const rows = await prisma.patientCondition.findMany({ where: { patientId } })
  return rows.map((r) => ({ id: r.id, patientId: r.patientId, condition: r.condition, status: r.status, diagnosedAt: r.diagnosedAt?.toISOString() ?? null, notes: r.notes }))
}

/** Replace the patient's active condition set. Used by the header chip editor. */
export async function setConditions(patientId: string, conditions: string[]): Promise<PatientCondition[]> {
  const at = new Date().toISOString()
  if (!isLive()) {
    const store = getDemoStore() as unknown as { conditions?: PatientCondition[] }
    const prev = (store.conditions ?? []).filter((c) => c.patientId === patientId)
    const next: PatientCondition[] = conditions.map((condition) => {
      const existing = prev.find((c) => c.condition.toLowerCase() === condition.toLowerCase())
      if (existing) return existing
      return { id: uid('cnd'), patientId, condition, status: 'ACTIVE', diagnosedAt: at, notes: null }
    })
    // remove toggled-off (seed conditions not in the new set)
    const seed = conditionsForPatient(patientId)
    const kept = next.length ? next : seed
    store.conditions = [...(store.conditions ?? []).filter((c) => c.patientId !== patientId), ...kept]
    return kept
  }
  const prisma = getPrisma()
  const { assertPatientInClinic } = await import('./data')
  await assertPatientInClinic(patientId)
  await prisma.$transaction(async (tx) => {
    await tx.patientCondition.deleteMany({ where: { patientId } })
    if (conditions.length) {
      await tx.patientCondition.createMany({
        data: conditions.map((condition) => ({ patientId, condition, status: 'ACTIVE', diagnosedAt: new Date() })),
      })
    }
  })
  return getConditions(patientId)
}

export async function getCarePlans(patientId: string): Promise<CarePlan[]> {
  if (!isLive()) {
    return carePlansForPatient(patientId)
  }
  const prisma = getPrisma()
  const rows = await prisma.carePlan.findMany({ where: { patientId }, include: { items: true }, orderBy: { createdAt: 'desc' } })
  return rows.map((r) => ({
    id: r.id, patientId: r.patientId, consultationId: r.consultationId, name: r.name, preset: null,
    status: r.status, nextReview: r.nextReview?.toISOString() ?? null,
    items: r.items.map((it) => ({ id: it.id, carePlanId: it.carePlanId, category: it.category, title: it.title, detail: it.detail, adherence: it.adherence, isFavorite: it.isFavorite, done: it.done })),
  }))
}

export async function saveVisitMeasurements(input: { patientId: string; visitId?: string | null; values: Record<string, string | number | null> }): Promise<void> {
  const at = new Date().toISOString()
  const numericKeys = ['weight', 'height', 'waist', 'heart_rate', 'fasting_glucose', 'postmeal_glucose', 'hba1c', 'ldl', 'hdl', 'triglycerides', 'total_cholesterol', 'tsh', 'pain_score']
  const entries: Measurement[] = []
  for (const k of numericKeys) {
    const raw = input.values[k]
    if (raw == null || raw === '') continue
    const n = Number(raw)
    if (Number.isNaN(n)) continue
    entries.push({ id: uid('msr'), patientId: input.patientId, visitId: input.visitId ?? null, type: k, value: n, recordedAt: at, source: 'CLINIC' })
  }
  // BP split
  const sys = input.values['bp_sys'] ?? input.values['bp_systolic']
  const dia = input.values['bp_dia'] ?? input.values['bp_diastolic']
  if (sys != null && sys !== '' && !Number.isNaN(Number(sys))) {
    entries.push({ id: uid('msr'), patientId: input.patientId, visitId: input.visitId ?? null, type: 'bp_systolic', value: Number(sys), recordedAt: at, source: 'CLINIC' })
  }
  if (dia != null && dia !== '' && !Number.isNaN(Number(dia))) {
    entries.push({ id: uid('msr'), patientId: input.patientId, visitId: input.visitId ?? null, type: 'bp_diastolic', value: Number(dia), recordedAt: at, source: 'CLINIC' })
  }
  if (!entries.length) return
  if (!isLive()) {
    const store = getDemoStore() as unknown as { measurements?: Measurement[] }
    store.measurements = [...(store.measurements ?? []), ...entries]
    return
  }
  const prisma = getPrisma()
  const { getSessionUser } = await import('./data')
  const user = await getSessionUser()
  if (!user) throw new Error('Unauthorized')
  await prisma.measurement.createMany({
    data: entries.map((e) => ({ patientId: e.patientId, visitId: e.visitId, type: e.type, value: e.value, recordedAt: new Date(e.recordedAt), source: 'CLINIC' as const, clinicId: user.clinicId })),
  })
}

/** All patient conditions in the clinic (for condition-based list filters). */
export async function getAllConditions(): Promise<PatientCondition[]> {
  if (!isLive()) {
    const store = getDemoStore() as unknown as { conditions?: PatientCondition[] }
    if (store.conditions?.length) return store.conditions
    return demoConditions.map((c) => ({ ...c }))
  }
  const prisma = getPrisma()
  const { requireSessionUser } = await import('./data')
  const user = await requireSessionUser()
  const rows = await prisma.patientCondition.findMany({
    where: { patient: { clinicId: user.clinicId } },
    select: { id: true, patientId: true, condition: true, status: true, diagnosedAt: true, notes: true },
  })
  return rows.map((r) => ({ id: r.id, patientId: r.patientId, condition: r.condition, status: r.status, diagnosedAt: r.diagnosedAt?.toISOString() ?? null, notes: r.notes }))
}
