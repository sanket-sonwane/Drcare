"use server"

import { redirect } from "next/navigation"
import { toMinor } from "./utils"
import {
  createPatient as createPatientImpl,
  createPayment as createPaymentImpl,
  createAppointment as createAppointmentImpl,
  createConsultation as createConsultationImpl,
  updateAppointmentStatus as updateAppointmentStatusImpl,
  markFollowUp as markFollowUpImpl,
  updateTreatment as updateTreatmentImpl,
  getSessionUser,
  searchPatients as searchPatientsImpl,
  type NewPatientInput,
  type NewPaymentInput,
  type NewAppointmentInput,
  type NewConsultationInput,
} from "./data"

export async function searchPatients(query: string) {
  // Authenticated-only: never enumerate patients for anonymous callers.
  // Returns [] (not a redirect) so the live search input degrades gracefully.
  const user = await getSessionUser()
  if (!user) return []
  return searchPatientsImpl(query)
}

export async function createPatientAction(input: NewPatientInput) {
  const user = await getSessionUser()
  if (!user) redirect("/login")
  const patient = await createPatientImpl(input)
  redirect(`/patients/${patient.id}`)
}

export async function createAppointmentAction(input: NewAppointmentInput) {
  const user = await getSessionUser()
  if (!user) redirect("/login")
  await createAppointmentImpl(input)
}

export async function createConsultationAction(input: Omit<NewConsultationInput, "doctorId">) {
  const user = await getSessionUser()
  if (!user) redirect("/login")
  await createConsultationImpl({ ...input, doctorId: user.id })
  redirect(`/patients/${input.patientId}`)
}

export async function createPaymentAction(input: NewPaymentInput) {
  const user = await getSessionUser()
  if (!user) redirect("/login")
  await createPaymentImpl(input)
}

export async function markFollowUpAction(id: string, status: string) {
  const user = await getSessionUser()
  if (!user) redirect("/login")
  await markFollowUpImpl(id, status as "COMPLETED")
}

export async function updateTreatmentAction(
  id: string,
  data: { status?: string; response?: string; notes?: string }
) {
  const user = await getSessionUser()
  if (!user) redirect("/login")
  await updateTreatmentImpl(id, {
    status: data.status as "ONGOING",
    response: data.response as "IMPROVING",
    notes: data.notes,
  })
}

export async function updateAppointmentStatusAction(id: string, status: string) {
  const user = await getSessionUser()
  if (!user) redirect("/login")
  await updateAppointmentStatusImpl(id, status as Parameters<typeof updateAppointmentStatusImpl>[1])
}

export async function updateConditionsAction(patientId: string, conditions: string[]) {
  const user = await getSessionUser()
  if (!user) redirect("/login")
  const { setConditions } = await import("./clinical-data")
  await setConditions(patientId, conditions)
}

export async function recordRefundAction(input: { paymentId: string; amount: number; reason?: string }) {
  const user = await getSessionUser()
  if (!user) redirect("/login")
  const { recordRefund } = await import("./billing")
  // amount arrives in major units (₹) from the form — convert to minor.
  await recordRefund({ paymentId: input.paymentId, amount: toMinor(input.amount), reason: input.reason })
}

export async function enrollInPackageAction(input: { patientId: string; packageId: string }) {
  const user = await getSessionUser()
  if (!user) redirect("/login")
  const { enrollInPackage } = await import("./billing")
  await enrollInPackage(input)
}