"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Plus, RotateCcw, Wallet, FileText } from "lucide-react"
import type { CarePackage, Invoice, LedgerEntry, PackageEnrollment, Payment, Patient } from "@/types"
import { PAYMENT_METHODS, PAYMENT_STATUS_LABEL } from "@/lib/constants"
import { StatusBadge, variantForStatus, dotForStatus } from "@/components/ui/status-badge"
import { EmptyState } from "@/components/ui/empty-state"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import { formatMoney, formatDate, toMinor } from "@/lib/utils"
import { recordRefundAction, enrollInPackageAction } from "@/lib/client-actions"
import { CollectPayment } from "@/components/clinical/payment-actions"

export function PatientBilling({
  patient,
  payments,
  invoices,
  ledger,
  enrollments,
  packages,
  patients,
}: {
  patient: { id: string; firstName: string; lastName?: string | null }
  payments: Payment[]
  invoices: Invoice[]
  ledger: LedgerEntry[]
  enrollments: PackageEnrollment[]
  packages: CarePackage[]
  patients: Pick<Patient, 'id' | 'firstName' | 'lastName' | 'patientCode'>[]
}) {
  const total = payments.reduce((s, p) => s + p.amount, 0)
  const paid = payments.filter((p) => p.status === 'PAID').reduce((s, p) => s + p.amount, 0)
  const pending = payments.filter((p) => p.status === 'PENDING' || p.status === 'PARTIAL' || p.status === 'OVERDUE').reduce((s, p) => s + p.amount, 0)

  return (
    <div className="space-y-5">
      {/* Balance strip */}
      <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-card p-4 text-sm">
        <p className="font-semibold">Patient Balance</p>
        <span>Total <strong>{formatMoney(total)}</strong></span>
        <span className="text-success">Paid <strong>{formatMoney(paid)}</strong></span>
        {pending > 0 ? (
          <span className="text-warning-foreground">Pending <strong>{formatMoney(pending)}</strong></span>
        ) : (
          <span className="text-success">Clear</span>
        )}
        <span className="ml-auto flex flex-wrap gap-2">
          {pending > 0 && <CollectPayment patientId={patient.id} patientName={`${patient.firstName} ${patient.lastName ?? ''}`.trim()} dueAmount={pending} compact />}
          <RecordPaymentInline patientId={patient.id} patientName={`${patient.firstName}`} />
        </span>
      </div>

      {/* Invoices */}
      <Card>
        <div className="p-4">
          <p className="font-semibold">Invoices</p>
        </div>
        {invoices.length === 0 ? (
          <EmptyState icon={FileText} title="No invoices yet" description="Invoices are generated automatically when a visit is saved." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Invoice</th>
                  <th className="px-4 py-3 font-medium">Issued</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                  <th className="px-4 py-3 text-right font-medium">Paid</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{inv.invoiceNo}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(inv.issuedAt)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{inv.lineItems.map((l) => l.description).join(', ')}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={inv.status} label={PAYMENT_STATUS_LABEL[inv.status]} variant={variantForStatus(inv.status)} dotClassName={dotForStatus(inv.status)} />
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{formatMoney(inv.totalAmount)}</td>
                    <td className="px-4 py-3 text-right font-medium text-success">{formatMoney(inv.paidAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Ledger */}
      <Card>
        <div className="p-4">
          <p className="font-semibold">Ledger</p>
        </div>
        {ledger.length === 0 ? (
          <EmptyState icon={Wallet} title="No ledger entries" description="Charges, payments and refunds appear here automatically." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Kind</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((l) => (
                  <tr key={l.id} className="border-b last:border-0">
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(l.createdAt)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${l.kind === 'CHARGE' ? 'bg-muted text-foreground' : l.kind === 'PAYMENT' ? 'bg-success/15 text-success' : l.kind === 'REFUND' ? 'bg-destructive/15 text-destructive' : 'bg-warning/15 text-warning-foreground'}`}>
                        {l.kind}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{l.description ?? l.reference ?? '—'}</td>
                    <td className={`px-4 py-3 text-right font-medium ${l.amount < 0 ? 'text-success' : ''}`}>{l.amount === 0 ? '—' : formatMoney(l.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Payments */}
      {payments.length > 0 && (
        <Card>
          <div className="p-4">
            <p className="font-semibold">Payments</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium">Method</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(p.paymentDate)}</td>
                    <td className="px-4 py-3">{p.description ?? 'Payment'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{PAYMENT_METHODS.find((m) => m.value === p.method)?.label ?? p.method}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={p.status} label={PAYMENT_STATUS_LABEL[p.status]} variant={variantForStatus(p.status)} dotClassName={dotForStatus(p.status)} />
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{formatMoney(p.amount)}</td>
                    <td className="px-4 py-3">
                      {p.status === 'PAID' ? (
                        <RefundButton payment={p} />
                      ) : p.status === 'PENDING' || p.status === 'PARTIAL' || p.status === 'OVERDUE' ? (
                        <CollectPayment patientId={patient.id} patientName={`${patient.firstName}`} dueAmount={p.amount} compact />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Care program enrollments */}
      <Card>
        <div className="flex items-center justify-between p-4">
          <p className="font-semibold">Care Programs</p>
          <EnrollButton patientId={patient.id} packages={packages} patients={patients} />
        </div>
        {enrollments.length === 0 ? (
          <EmptyState icon={Plus} title="Not enrolled" description="Sign this patient up to a care package to plan a course of visits." />
        ) : (
          <div className="space-y-3 p-4 pt-0">
            {enrollments.map((e) => {
              const pkg = e.package
              const pct = pkg ? Math.min(100, Math.round((e.visitsCompleted / pkg.visitCount) * 100)) : 0
              return (
                <div key={e.id} className="space-y-1 rounded-lg border p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{pkg?.name ?? 'Care Program'}</span>
                    <span className="text-muted-foreground">Visit {e.visitsCompleted}/{pkg?.visitCount ?? '—'}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-primary/20">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatMoney(e.price)} package · Paid {formatMoney(e.paidAmount)}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}

function RefundButton({ payment }: { payment: Payment }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const amount = Number(fd.get('amount') ?? 0)
    if (!amount || amount <= 0 || toMinor(amount) > payment.amount) {
      toast.error('Enter a valid refund amount')
      return
    }
    startTransition(async () => {
      try {
        await recordRefundAction({ paymentId: payment.id, amount, reason: String(fd.get('reason') ?? '') || undefined })
        toast.success('✓ Refund recorded')
        setOpen(false)
        router.refresh()
      } catch {
        toast.error('Could not record refund')
      }
    })
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <RotateCcw className="h-3.5 w-3.5" /> Refund
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm" onClick={() => setOpen(false)} role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-lg border bg-card p-6 text-card-foreground shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold">Refund Payment</h2>
            <p className="text-sm text-muted-foreground">{formatMoney(payment.amount)} · {payment.description}</p>
            <form onSubmit={onSubmit} className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="refund-amount">Amount (₹)</Label>
                <Input id="refund-amount" name="amount" type="number" min="1" max={Math.round(payment.amount / 100)} step="0.01" required defaultValue={Math.round(payment.amount / 100)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="refund-reason">Reason</Label>
                <Input id="refund-reason" name="reason" placeholder="Duplicate charge, cancelled visit…" />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Confirm Refund'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

function EnrollButton({ patientId, packages, patients }: { patientId: string; packages: CarePackage[]; patients: Pick<Patient, 'id' | 'firstName' | 'lastName' | 'patientCode'>[] }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [selected, setSelected] = useState(packages[0]?.id ?? '')
  const router = useRouter()

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selected) {
      toast.error('Choose a package')
      return
    }
    startTransition(async () => {
      try {
        await enrollInPackageAction({ patientId, packageId: selected })
        toast.success('✓ Enrolled to care program')
        setOpen(false)
        router.refresh()
      } catch {
        toast.error('Could not enroll')
      }
    })
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Enroll
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm" onClick={() => setOpen(false)} role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-lg border bg-card p-6 text-card-foreground shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold">Enroll to a Care Program</h2>
            <p className="text-sm text-muted-foreground">{patients.find((p) => p.id === patientId)?.firstName ?? ''}</p>
            <form onSubmit={onSubmit} className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="enroll-package">Program</Label>
                <Select id="enroll-package" value={selected} onChange={(e) => setSelected(e.target.value)}>
                  {packages.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} · {formatMoney(p.price)} · {p.visitCount} visits</option>
                  ))}
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Enroll'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

function RecordPaymentInline({ patientId, patientName }: { patientId: string; patientName: string }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const amount = Number(fd.get('amount') ?? 0)
    if (!amount || amount <= 0) {
      toast.error('Enter a valid amount')
      return
    }
    startTransition(async () => {
      try {
        const { createPaymentAction } = await import('@/lib/client-actions')
        await createPaymentAction({
          patientId,
          amount: toMinor(amount),
          method: String(fd.get('method') ?? 'CASH') as Payment['method'],
          status: 'PAID',
          description: String(fd.get('description') ?? 'Payment'),
        })
        toast.success('Payment recorded')
        setOpen(false)
        router.refresh()
      } catch {
        toast.error('Could not record payment')
      }
    })
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Record Payment</Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm" onClick={() => setOpen(false)} role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-lg border bg-card p-6 text-card-foreground shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold">Record Payment</h2>
            <p className="text-sm text-muted-foreground">for {patientName}</p>
            <form onSubmit={onSubmit} className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (₹)</Label>
                <Input id="amount" name="amount" type="number" min="1" step="0.01" required placeholder="500" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="method">Method</Label>
                <Select id="method" name="method" defaultValue="CASH">
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input id="description" name="description" placeholder="Consultation fee…" />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save Payment'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}