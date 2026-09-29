"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PAYMENT_METHODS } from "@/lib/constants"
import { createPaymentAction } from "@/lib/client-actions"
import { formatMoney, toMinor } from "@/lib/utils"
import type { Payment } from "@/types"

/**
 * PRD §55-58 — Consultation payment flow + partial + split + quick collect.
 * Open Patient → Collect → Method → Confirm. No accounting screens.
 */
export function CollectPayment({ patientId, patientName, dueAmount, compact }: {
  patientId: string; patientName: string; dueAmount?: number; compact?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [mode, setMode] = useState<'full' | 'partial' | 'split'>('full')
  const [method, setMethod] = useState('UPI')
  const [amount, setAmount] = useState(dueAmount ? String(Math.round(dueAmount / 100)) : '')
  const [splitCash, setSplitCash] = useState('')
  const [splitUpi, setSplitUpi] = useState('')
  const router = useRouter()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const total = dueAmount ?? toMinor(Number(amount) || 0)
    let payAmount = total
    let desc = `Collection · ${patientName}`
    if (mode === 'partial') {
      payAmount = toMinor(Number(amount) || 0)
      if (!payAmount || payAmount >= total) { toast.error("Partial amount must be less than total due"); return }
      desc += ` (partial, balance ${formatMoney(total - payAmount)})`
    }
    if (mode === 'split') {
      const c = toMinor(Number(splitCash) || 0), u = toMinor(Number(splitUpi) || 0)
      if (c + u <= 0) { toast.error("Enter split amounts"); return }
      payAmount = c + u
      desc += ` (split: cash ${formatMoney(c)} + UPI ${formatMoney(u)})`
    }
    startTransition(async () => {
      try {
        await createPaymentAction({
          patientId,
          amount: mode === 'partial' ? payAmount : total,
          method: method as Payment['method'],
          status: mode === 'partial' ? 'PARTIAL' : 'PAID',
          description: desc,
        })
        toast.success(`✓ Payment received — ${formatMoney(payAmount)} via ${method}`)
        setOpen(false)
        router.refresh()
      } catch { toast.error("Could not record payment") }
    })
  }

  if (compact && dueAmount) {
    return (
      <span className="inline-flex gap-1.5">
        <Button size="sm" onClick={() => { setMode('full'); setAmount(String(Math.round(dueAmount / 100))); setOpen(true) }}>Collect {formatMoney(dueAmount)}</Button>
      </span>
    )
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>Collect Payment</Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm" onClick={() => setOpen(false)} role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-lg border bg-card p-4 text-card-foreground shadow-lg sm:p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold">Collect Payment</h2>
            <p className="text-sm text-muted-foreground">{patientName}{dueAmount ? ` · Due ${formatMoney(dueAmount)}` : ''}</p>
            <form onSubmit={submit} className="mt-4 space-y-4">
              <div className="flex gap-1.5">
                {(['full', 'partial', 'split'] as const).map((m) => (
                  <button key={m} type="button" onClick={() => setMode(m)} className={`min-h-10 rounded-full border px-3 py-1 text-xs font-medium ${mode === m ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-accent'}`}>{m === 'full' ? 'Paid' : m === 'partial' ? 'Partial' : 'Split'}</button>
                ))}
              </div>
              {mode === 'partial' && (
                <div className="space-y-2"><Label>Amount paid (₹)</Label><Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" placeholder="700" />
                  {dueAmount && <p className="text-xs text-muted-foreground">Remaining {formatMoney(dueAmount - toMinor(Number(amount) || 0))}</p>}</div>
              )}
              {mode === 'split' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Cash (₹)</Label><Input value={splitCash} onChange={(e) => setSplitCash(e.target.value)} inputMode="numeric" placeholder="300" /></div>
                  <div className="space-y-2"><Label>UPI (₹)</Label><Input value={splitUpi} onChange={(e) => setSplitUpi(e.target.value)} inputMode="numeric" placeholder="500" /></div>
                </div>
              )}
              <div className="space-y-2"><Label>Method</Label>
                <div className="flex flex-wrap gap-1.5">
                  {PAYMENT_METHODS.map((m) => (
                    <button key={m.value} type="button" onClick={() => setMethod(m.value)} className={`rounded-md border px-2.5 py-1 text-xs font-medium ${method === m.value ? 'border-primary bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent'}`}>{m.label}</button>
                  ))}
                </div></div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Confirm'}</Button></div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

/** Quick buttons: Collect ₹X / Collect Pending / Custom (§58). */
export function QuickCollect({ patientId, patientName, pending }: { patientId: string; patientName: string; pending: number }) {
  if (!pending) return <span className="text-xs font-medium text-success">Clear</span>
  return (
    <span className="inline-flex flex-wrap gap-1.5">
      <CollectPayment patientId={patientId} patientName={patientName} dueAmount={pending} compact />
    </span>
  )
}
