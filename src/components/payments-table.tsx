"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Plus, Wallet } from "lucide-react"
import type { Payment } from "@/types"
import { createPaymentAction } from "@/lib/client-actions"
import { formatMoney, formatDate, toMinor } from "@/lib/utils"
import { PAYMENT_METHODS, PAYMENT_STATUS_LABEL } from "@/lib/constants"
import { StatusBadge, variantForStatus, dotForStatus } from "@/components/ui/status-badge"
import { EmptyState } from "@/components/ui/empty-state"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { CollectPayment } from "@/components/clinical/payment-actions"

export function PaymentsTable({ patientId, patientName, payments }: { patientId: string; patientName: string; payments: Payment[] }) {
  const total = payments.reduce((s, p) => s + p.amount, 0)
  const paid = payments.filter((p) => p.status === "PAID").reduce((s, p) => s + p.amount, 0)
  const pending = payments.filter((p) => p.status === "PENDING" || p.status === "PARTIAL" || p.status === "OVERDUE").reduce((s, p) => s + p.amount, 0)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-card p-4">
        <p className="text-sm font-semibold">Patient Balance</p>
        <span className="text-sm">Total <strong>{formatMoney(total)}</strong></span>
        <span className="text-sm text-success">Paid <strong>{formatMoney(paid)}</strong></span>
        {pending > 0 ? (
          <span className="text-sm text-warning-foreground">Pending <strong>{formatMoney(pending)}</strong></span>
        ) : (
          <span className="text-sm text-success">Clear</span>
        )}
        <span className="ml-auto flex gap-2">
          {pending > 0 && <CollectPayment patientId={patientId} patientName={patientName} dueAmount={pending} compact />}
          <RecordPaymentButton patientId={patientId} patientName={patientName} />
        </span>
      </div>

      {payments.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <EmptyState icon={Wallet} title="No payments yet" description="Payments made during or after consultations will appear here." />
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium">Method</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(p.paymentDate)}</td>
                  <td className="px-4 py-3">{p.description ?? "Payment"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.method}</td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      status={p.status}
                      label={PAYMENT_STATUS_LABEL[p.status]}
                      variant={variantForStatus(p.status)}
                      dotClassName={dotForStatus(p.status)}
                    />
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{formatMoney(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function RecordPaymentButton({ patientId, patientName }: { patientId: string; patientName: string }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const amount = Number(fd.get("amount") ?? 0)
    if (!amount || amount <= 0) {
      toast.error("Enter a valid amount")
      return
    }
    startTransition(async () => {
      try {
        await createPaymentAction({
          patientId,
          amount: toMinor(amount),
          method: String(fd.get("method") ?? "CASH") as Payment["method"],
          status: "PAID",
          description: String(fd.get("description") ?? "Payment"),
        })
        toast.success("Payment recorded")
        setOpen(false)
        router.refresh()
      } catch {
        toast.error("Could not record payment")
      }
    })
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Record Payment
      </Button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          aria-modal="true"
          role="dialog"
        >
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
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input id="description" name="description" placeholder="Consultation fee, physio session…" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending ? "Saving…" : "Save Payment"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border bg-card text-card-foreground shadow-sm">{children}</div>
}
function CardContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={className}>{children}</div>
}