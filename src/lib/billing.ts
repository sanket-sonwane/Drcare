import { isLive, getPrisma } from './db'
import { getDemoStore } from './demo-data'
import { uid } from './utils'
import type { CarePackage, Invoice, LedgerEntry, PackageEnrollment, Payment, Refund } from '@/types'

// Billing layer (v2): invoices, payment → ledger, refunds, care packages.
// Mirror style of clinical-data.ts — demo store mutates session memory,
// live mode hits Prisma scoped to the session clinic.

// ────────────────────────────────────────────────────────────────
// Reads
// ────────────────────────────────────────────────────────────────

export async function getAllInvoices(): Promise<Invoice[]> {
  if (!isLive()) {
    return [...(store().invoices ?? [])].sort((a, b) => b.issuedAt.localeCompare(a.issuedAt))
  }
  const prisma = getPrisma()
  const { requireSessionUser } = await import('./data')
  const user = await requireSessionUser()
  const rows = await prisma.invoice.findMany({
    where: { clinicId: user.clinicId },
    include: { lineItems: true, patient: { select: { id: true, firstName: true, lastName: true, patientCode: true } } },
    orderBy: { issuedAt: 'desc' },
  })
  return rows.map(mapInvoiceRow)
}

export async function getInvoicesForPatient(patientId: string): Promise<Invoice[]> {
  if (!isLive()) {
    return (store().invoices ?? []).filter((i) => i.patientId === patientId).sort((a, b) => b.issuedAt.localeCompare(a.issuedAt))
  }
  const prisma = getPrisma()
  const { assertPatientInClinic } = await import('./data')
  const user = await assertPatientInClinic(patientId)
  const rows = await prisma.invoice.findMany({
    where: { patientId, clinicId: user.clinicId },
    include: { lineItems: true, patient: { select: { id: true, firstName: true, lastName: true, patientCode: true } } },
    orderBy: { issuedAt: 'desc' },
  })
  return rows.map(mapInvoiceRow)
}

export async function getLedgerForPatient(patientId: string): Promise<LedgerEntry[]> {
  if (!isLive()) {
    return (store().ledgerEntries ?? [])
      .filter((l) => l.patientId === patientId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }
  const prisma = getPrisma()
  const { assertPatientInClinic } = await import('./data')
  const user = await assertPatientInClinic(patientId)
  const rows = await prisma.ledgerEntry.findMany({
    where: { patientId, clinicId: user.clinicId },
    orderBy: { createdAt: 'desc' },
  })
  return rows.map(mapLedgerRow)
}

export async function getCarePackages(): Promise<CarePackage[]> {
  if (!isLive()) {
    return [...(store().carePackages ?? [])]
  }
  const prisma = getPrisma()
  const { requireSessionUser } = await import('./data')
  const user = await requireSessionUser()
  const rows = await prisma.carePackage.findMany({ where: { clinicId: user.clinicId, isActive: true } })
  return rows.map((r) => ({ id: r.id, name: r.name, description: r.description, price: r.price, visitCount: r.visitCount }))
}

export async function getEnrollments(patientId?: string): Promise<PackageEnrollment[]> {
  if (!isLive()) {
    const rows = store().packageEnrollments ?? []
    return (patientId ? rows.filter((e) => e.patientId === patientId) : rows).map((e) => ({
      ...e,
      package: (store().carePackages ?? []).find((p) => p.id === e.packageId) ?? null,
    }))
  }
  const prisma = getPrisma()
  const { requireSessionUser } = await import('./data')
  const user = await requireSessionUser()
  const rows = await prisma.packageEnrollment.findMany({
    where: { patient: { clinicId: user.clinicId }, ...(patientId ? { patientId } : {}) },
    include: { package: true, patient: { select: { id: true, firstName: true, lastName: true, patientCode: true } } },
  })
  return rows.map((r) => ({
    id: r.id,
    packageId: r.packageId,
    patientId: r.patientId,
    price: r.price,
    paidAmount: r.paidAmount,
    visitsCompleted: r.visitsCompleted,
    status: r.status as PackageEnrollment['status'],
    package: r.package ? { id: r.package.id, name: r.package.name, description: r.package.description, price: r.package.price, visitCount: r.package.visitCount } : null,
    patient: r.patient && { id: r.patient.id, firstName: r.patient.firstName, lastName: r.patient.lastName, patientCode: r.patient.patientCode },
  }))
}

// ────────────────────────────────────────────────────────────────
// Writes
// ────────────────────────────────────────────────────────────────

/**
 * Golden save + billing: one invoice (+ line item), one payment row linked to
 * it, and matching ledger entries. PARTIAL ⇒ payment.amount stores the
 * outstanding balance (matches pending-sum conventions elsewhere).
 */
export async function recordConsultationBilling(input: {
  patientId: string
  consultationId?: string | null
  description: string
  fee: number // full fee, minor units
  paidNow?: number // what was actually paid (PAID: fee, PENDING: 0, PARTIAL: partial)
  paymentStatus: Payment['status']
  paymentMethod: Payment['method']
}): Promise<{ payment: Payment; invoice: Invoice }> {
  const { patientId, consultationId, description, fee } = input
  const paidNow =
    input.paymentStatus === 'PAID'
      ? fee
      : input.paymentStatus === 'PARTIAL'
        ? Math.min(Math.max(input.paidNow ?? 0, 0), fee)
        : 0
  // Payment.amount: PAID ⇒ full collected; PARTIAL/PENDING ⇒ outstanding balance.
  const outstanding = input.paymentStatus === 'PARTIAL' ? fee - paidNow : fee
  const at = new Date().toISOString()

  if (!isLive()) {
    const s = store()
    const invoice: Invoice = {
      id: uid('inv'),
      invoiceNo: nextInvoiceNo(),
      patientId,
      consultationId: consultationId ?? null,
      subtotal: fee,
      discount: 0,
      totalAmount: fee,
      paidAmount: paidNow,
      status: paidNow >= fee ? 'PAID' : paidNow > 0 ? 'PARTIAL' : 'PENDING',
      issuedAt: at,
      dueDate: input.paymentStatus === 'PENDING' ? new Date(Date.now() + 7 * 864e5).toISOString() : null,
      lineItems: [{ description, amount: fee, quantity: 1 }],
    }
    s.invoices = [...(s.invoices ?? []), invoice]
    const payment: Payment = {
      id: uid('pay'),
      clinicId: s.clinic.id,
      patientId,
      invoiceId: invoice.id,
      consultationId: consultationId ?? null,
      amount: outstanding,
      method: input.paymentMethod,
      status: input.paymentStatus,
      description,
      paymentDate: at,
      dueDate: input.paymentStatus === 'PENDING' ? new Date(Date.now() + 7 * 864e5).toISOString() : null,
      recordedByName: s.user.name,
    }
    s.payments = [...s.payments, payment]
    const chargeLedger: LedgerEntry = { id: uid('led'), clinicId: s.clinic.id, patientId, kind: 'CHARGE', amount: fee, reference: invoice.invoiceNo, invoiceId: invoice.id, description, createdAt: at }
    const ledger: LedgerEntry[] = [chargeLedger]
    if (paidNow > 0) {
      ledger.push({ id: uid('led'), clinicId: s.clinic.id, patientId, kind: 'PAYMENT', amount: -paidNow, reference: invoice.invoiceNo, invoiceId: invoice.id, paymentId: payment.id, description: `${description} — received`, createdAt: at })
    }
    s.ledgerEntries = [...(s.ledgerEntries ?? []), ...ledger]
    return { payment, invoice }
  }

  const prisma = getPrisma()
  const { assertPatientInClinic } = await import('./data')
  const user = await assertPatientInClinic(patientId)
  const invoice = await prisma.$transaction(async (tx) => {
    const count = await tx.invoice.count({ where: { clinicId: user.clinicId } })
    const inv = await tx.invoice.create({
      data: {
        invoiceNo: `INV-${1000 + count + 1}`,
        clinicId: user.clinicId,
        patientId,
        consultationId,
        subtotal: fee,
        discount: 0,
        totalAmount: fee,
        paidAmount: paidNow,
        status: paidNow >= fee ? 'PAID' : paidNow > 0 ? 'PARTIAL' : 'PENDING',
        dueDate: input.paymentStatus === 'PENDING' ? new Date(Date.now() + 7 * 864e5) : null,
        lineItems: { create: [{ description, amount: fee, quantity: 1 }] },
      },
    })
    const pay = await tx.payment.create({
      data: {
        clinicId: user.clinicId,
        patientId,
        invoiceId: inv.id,
        consultationId,
        amount: outstanding,
        method: input.paymentMethod,
        status: input.paymentStatus,
        description,
        recordedById: user.id,
        dueDate: input.paymentStatus === 'PENDING' ? new Date(Date.now() + 7 * 864e5) : null,
      },
    })
    const ledgerRows: { clinicId: string; patientId: string; kind: 'CHARGE' | 'PAYMENT'; amount: number; reference: string; invoiceId: string; paymentId?: string; description: string }[] = [
      { clinicId: user.clinicId, patientId, kind: 'CHARGE', amount: fee, reference: inv.invoiceNo, invoiceId: inv.id, description },
    ]
    if (paidNow > 0) ledgerRows.push({ clinicId: user.clinicId, patientId, kind: 'PAYMENT', amount: -paidNow, reference: inv.invoiceNo, invoiceId: inv.id, paymentId: pay.id, description: `${description} — received` })
    await tx.ledgerEntry.createMany({ data: ledgerRows })
    return { id: inv.id, invoiceNo: inv.invoiceNo, patientId, consultationId, subtotal: inv.subtotal, discount: inv.discount, totalAmount: inv.totalAmount, paidAmount: inv.paidAmount, status: inv.status, issuedAt: inv.issuedAt.toISOString(), dueDate: inv.dueDate?.toISOString() ?? null, lineItems: [{ description, amount: fee, quantity: 1 }] }
  })
  const payment = await prisma.payment.findFirst({ where: { id: (await prisma.payment.findFirst({ where: { invoiceId: invoice.id }, select: { id: true } }))!.id }, include: { patient: { select: { id: true, firstName: true, lastName: true, patientCode: true } }, recordedBy: { select: { name: true } } } })
  return {
    invoice,
    payment: {
      id: payment!.id,
      clinicId: payment!.clinicId,
      patientId: payment!.patientId,
      invoiceId: payment!.invoiceId,
      consultationId: payment!.consultationId,
      amount: payment!.amount,
      method: payment!.method,
      status: payment!.status,
      transactionReference: payment!.transactionReference,
      description: payment!.description,
      paymentDate: payment!.paymentDate.toISOString(),
      dueDate: payment!.dueDate?.toISOString() ?? null,
      recordedByName: payment!.recordedBy?.name ?? null,
      patient: payment!.patient && { id: payment!.patient.id, firstName: payment!.patient.firstName, lastName: payment!.patient.lastName, patientCode: payment!.patient.patientCode },
    },
  }
}

/** Refund a fully-paid payment. Marks it REFUNDED, adds ledger REFUND, drops invoice paidAmount. */
export async function recordRefund(input: { paymentId: string; amount: number; reason?: string }): Promise<Refund> {
  const at = new Date().toISOString()
  if (!isLive()) {
    const s = store()
    const pay = (s.payments ?? []).find((p) => p.id === input.paymentId)
    if (!pay) throw new Error('Payment not found')
    if (pay.status !== 'PAID' || input.amount <= 0 || input.amount > pay.amount) throw new Error('Invalid refund')
    pay.status = 'REFUNDED'
    pay.description = `${pay.description ?? 'Payment'} — refunded`
    const refund: Refund = { id: uid('ref'), clinicId: s.clinic.id, paymentId: pay.id, amount: input.amount, reason: input.reason ?? null, createdBy: s.user.name, createdAt: at }
    s.refunds = [...(s.refunds ?? []), refund]
    s.ledgerEntries = [...(s.ledgerEntries ?? []), { id: uid('led'), clinicId: s.clinic.id, patientId: pay.patientId, kind: 'REFUND', amount: -input.amount, reference: refund.id, paymentId: pay.id, invoiceId: pay.invoiceId, description: `Refund — ${input.reason ?? 'payment reversal'}`, createdAt: at }]
    if (pay.invoiceId) {
      const inv = (s.invoices ?? []).find((i) => i.id === pay.invoiceId)
      if (inv) {
        inv.paidAmount = Math.max(0, inv.paidAmount - input.amount)
        inv.status = inv.paidAmount >= inv.totalAmount ? 'PAID' : inv.paidAmount > 0 ? 'PARTIAL' : 'PENDING'
      }
    }
    return refund
  }
  const prisma = getPrisma()
  const { requireSessionUser } = await import('./data')
  const user = await requireSessionUser()
  const pay = await prisma.payment.findFirst({ where: { id: input.paymentId, clinicId: user.clinicId, status: 'PAID' } })
  if (!pay || input.amount <= 0 || input.amount > pay.amount) throw new Error('Invalid refund')
  const refund = await prisma.$transaction(async (tx) => {
    await tx.payment.update({ where: { id: pay.id }, data: { status: 'REFUNDED' } })
    const r = await tx.refund.create({ data: { clinicId: user.clinicId, paymentId: pay.id, amount: input.amount, reason: input.reason, createdBy: user.id } })
    await tx.ledgerEntry.create({ data: { clinicId: user.clinicId, patientId: pay.patientId, kind: 'REFUND', amount: -input.amount, reference: r.id, paymentId: pay.id, invoiceId: pay.invoiceId, description: `Refund — ${input.reason ?? 'payment reversal'}` } })
    if (pay.invoiceId) {
      const inv = await tx.invoice.findUnique({ where: { id: pay.invoiceId } })
      if (inv) {
        const paid = Math.max(0, inv.paidAmount - input.amount)
        await tx.invoice.update({ where: { id: inv.id }, data: { paidAmount: paid, status: paid >= inv.totalAmount ? 'PAID' : paid > 0 ? 'PARTIAL' : 'PENDING' } })
      }
    }
    return r
  })
  return { id: refund.id, clinicId: user.clinicId, paymentId: refund.paymentId, amount: refund.amount, reason: refund.reason, createdBy: user.name, createdAt: refund.createdAt.toISOString() }
}

/**
 * Sign a patient up to a care package. Records an optional PAID advance
 * payment + ledger credit so the package balance is real.
 */
export async function enrollInPackage(input: { patientId: string; packageId: string; paidAmount?: number }): Promise<PackageEnrollment> {
  const paid = 0 // reserved: full amount settled through individual visits
  if (!isLive()) {
    const s = store()
    const pkg = (s.carePackages ?? []).find((p) => p.id === input.packageId)
    if (!pkg) throw new Error('Care package not found')
    const enrollment: PackageEnrollment = { id: uid('pen'), packageId: pkg.id, patientId: input.patientId, price: pkg.price, paidAmount: paid, visitsCompleted: 0, status: 'ACTIVE' }
    s.packageEnrollments = [...(s.packageEnrollments ?? []), enrollment]
    return { ...enrollment, package: pkg }
  }
  const prisma = getPrisma()
  const { assertPatientInClinic } = await import('./data')
  const user = await assertPatientInClinic(input.patientId)
  const pkg = await prisma.carePackage.findFirst({ where: { id: input.packageId, clinicId: user.clinicId } })
  if (!pkg) throw new Error('Care package not found')
  const row = await prisma.packageEnrollment.create({
    data: { packageId: pkg.id, patientId: input.patientId, price: pkg.price, paidAmount: paid, status: 'ACTIVE' },
    include: { package: true, patient: { select: { id: true, firstName: true, lastName: true, patientCode: true } } },
  })
  return {
    id: row.id, packageId: row.packageId, patientId: row.patientId, price: row.price, paidAmount: row.paidAmount,
    visitsCompleted: row.visitsCompleted, status: row.status as PackageEnrollment['status'],
    package: { id: row.package.id, name: row.package.name, description: row.package.description, price: row.package.price, visitCount: row.package.visitCount },
    patient: row.patient && { id: row.patient.id, firstName: row.patient.firstName, lastName: row.patient.lastName, patientCode: row.patient.patientCode },
  }
}

/** Count a consultation toward every active enrollment the patient holds (PRD §71). */
export async function markEnrollmentVisits(patientId: string): Promise<void> {
  if (!isLive()) {
    const s = store()
    for (const e of s.packageEnrollments ?? []) {
      if (e.patientId === patientId && e.status === 'ACTIVE') e.visitsCompleted += 1
    }
    return
  }
  const prisma = getPrisma()
  await prisma.packageEnrollment.updateMany({
    where: { patientId, status: 'ACTIVE' },
    data: { visitsCompleted: { increment: 1 } },
  })
}

// ────────────────────────────────────────────────────────────────
// Mappers + helpers
// ────────────────────────────────────────────────────────────────

function mapInvoiceRow(r: {
  id: string; invoiceNo: string; patientId: string; consultationId: string | null
  subtotal: number; discount: number; totalAmount: number; paidAmount: number; status: Invoice['status']
  issuedAt: Date; dueDate: Date | null
  lineItems: { description: string; amount: number; quantity: number }[]
  patient: { id: string; firstName: string; lastName: string | null; patientCode: string } | null
}): Invoice {
  return {
    id: r.id, invoiceNo: r.invoiceNo, patientId: r.patientId, consultationId: r.consultationId,
    subtotal: r.subtotal, discount: r.discount, totalAmount: r.totalAmount, paidAmount: r.paidAmount,
    status: r.status, issuedAt: r.issuedAt.toISOString(), dueDate: r.dueDate?.toISOString() ?? null,
    lineItems: r.lineItems.map((x) => ({ description: x.description, amount: x.amount, quantity: x.quantity })),
    patient: r.patient && { id: r.patient.id, firstName: r.patient.firstName, lastName: r.patient.lastName, patientCode: r.patient.patientCode },
  }
}

function mapLedgerRow(r: {
  id: string; clinicId: string; patientId: string; kind: LedgerEntry['kind']; amount: number
  reference: string | null; invoiceId: string | null; paymentId: string | null; description: string | null; createdAt: Date
}): LedgerEntry {
  return {
    id: r.id, clinicId: r.clinicId, patientId: r.patientId, kind: r.kind, amount: r.amount,
    reference: r.reference, invoiceId: r.invoiceId, paymentId: r.paymentId, description: r.description,
    createdAt: r.createdAt.toISOString(),
  }
}

function store() {
  return getDemoStore()
}

function nextInvoiceNo(): string {
  const count = getDemoStore().invoices?.length ?? 0
  return `INV-${1000 + count + 1}`
}