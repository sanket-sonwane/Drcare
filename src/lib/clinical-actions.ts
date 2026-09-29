"use server"

import { redirect } from "next/navigation"
import { getSessionUser, createConsultation as createConsultationImpl, type NewConsultationInput } from "./data"
import { saveVisitMeasurements as saveImpl } from "./clinical-data"

export async function saveVisitMeasurementsAction(input: { patientId: string; visitId?: string | null; values: Record<string, string | number | null> }) {
  const user = await getSessionUser()
  if (!user) redirect("/login")
  await saveImpl(input)
}

/**
 * Combined golden-workflow save: consultation + measurements in one
 * server action so a single redirect fires once. Calling
 * createConsultationAction then saveVisitMeasurementsAction from the
 * client loses the second call because redirect() throws.
 */
export async function createFollowUpVisitAction(input: {
  patientId: string
  consultation: Omit<NewConsultationInput, "doctorId" | "patientId">
  measurements: Record<string, string | number | null>
}) {
  const user = await getSessionUser()
  if (!user) redirect("/login")
  const created = await createConsultationImpl({ ...input.consultation, patientId: input.patientId, doctorId: user.id })
  await saveImpl({ patientId: input.patientId, visitId: created.id, values: input.measurements })
  redirect(`/patients/${input.patientId}`)
}
