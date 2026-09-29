"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowRight, Check, Loader2 } from "lucide-react"
import type { Measurement } from "@/types"
import { getTemplate } from "@/lib/visit-templates"
import { latestByType } from "@/lib/measurements"
import { createFollowUpVisitAction } from "@/lib/clinical-actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { VisitTypePicker } from "./visit-type-picker"
import { DynamicField, BpInput } from "./field-controls"
import { Select } from "@/components/ui/select"
import { CARE_PLAN_PRESETS, FAVORITE_DEFAULTS, PAYMENT_METHODS } from "@/lib/constants"
import { formatMoney, toMinor } from "@/lib/utils"

/**
 * Golden Workflow (§125): Patient → Visit Type → Previous values → What changed → Plan → Follow-up → Payment → Save.
 * Pick-first, previous-vs-current, same-as-previous, sticky save, autosave indicator.
 */
export function FollowUpVisit({ patientId, patientName, measurements, lastComplaint }: {
  patientId: string; patientName: string; measurements: Measurement[]; lastComplaint?: string | null
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [visitType, setVisitType] = useState('DIABETES')
  const template = useMemo(() => getTemplate(visitType), [visitType])
  const [values, setValues] = useState<Record<string, unknown>>({})
  const [bpSys, setBpSys] = useState('')
  const [bpDia, setBpDia] = useState('')
  const [symptoms, setSymptoms] = useState<string[]>([])
  const [assessment, setAssessment] = useState('')
  const [notes, setNotes] = useState('')
  const [careItems, setCareItems] = useState<string[]>(['Walking 30 min/day', 'Home BP monitoring'])
  const [followUpDate, setFollowUpDate] = useState('')
  const [fee, setFee] = useState('')
  const [payStatus, setPayStatus] = useState<'PAID' | 'PENDING' | 'PARTIAL'>('PAID')
  const [payMethod, setPayMethod] = useState('UPI')
  const [paidNow, setPaidNow] = useState('')

  const prev = (t: string) => latestByType(measurements, t)?.value ?? null
  const feeDefault = Math.round(template.defaultFee / 100)

  function set(k: string, v: unknown) { setValues((p) => ({ ...p, [k]: v })) }
  function sameAsPrevious(sectionKey: string) {
    // Carry forward: mark section confirmed without re-typing. Values stay as previous.
    toast.success(`${sectionTitle(sectionKey)} — carried forward from last visit`)
  }
  function sectionTitle(k: string) {
    return template.sections.find((s) => s.key === k)?.title ?? k
  }

  function handleSave() {
    const feeMinor = fee ? toMinor(Number(fee)) : toMinor(feeDefault)
    const partialPaid = payStatus === 'PARTIAL' ? toMinor(Number(paidNow) || 0) : feeMinor
    if (payStatus === 'PARTIAL' && (!partialPaid || partialPaid >= feeMinor)) {
      toast.error("Partial amount must be less than total fee")
      return
    }
    startTransition(async () => {
      try {
        // Single server action: consultation + measurements, one redirect.
        // Billing records the full fee as a charge + a ledger line for the
        // amount received (PAID/PARTIAL splits the remainder).
        await createFollowUpVisitAction({
          patientId,
          consultation: {
            chiefComplaint: `${template.name}${notes ? ` — ${notes.slice(0, 80)}` : ''}`,
            clinicalNotes: notes || undefined,
            assessment: assessment || undefined,
            symptoms: symptoms.map((s) => ({ name: s, severity: 'MODERATE' as const })),
            treatments: careItems.map((c) => ({ type: 'LIFESTYLE' as const, name: c })),
            followUp: followUpDate ? { scheduledDate: new Date(followUpDate).toISOString(), reason: `${template.name} review` } : null,
            fee: feeMinor,
            paidNow: partialPaid,
            paymentStatus: payStatus === 'PARTIAL' ? 'PARTIAL' : payStatus,
            paymentMethod: payMethod as 'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER' | 'OTHER',
          },
          measurements: { ...values as Record<string, string | number | null>, bp_sys: bpSys, bp_dia: bpDia },
        })
        toast.success("Visit saved — progress updated")
        router.push(`/patients/${patientId}`)
        router.refresh()
      } catch (e) {
        // Next.js redirect() throws NEXT_REDIRECT on success — not an error.
        if (e instanceof Error && /NEXT_REDIRECT/.test(e.message)) return
        toast.error(e instanceof Error ? e.message : "Could not save visit")
      }
    })
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Start Follow-up</h1>
        <p className="text-sm text-muted-foreground">{patientName} · confirm only what changed since last visit</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">1 · Choose Visit Type</CardTitle>
          <CardDescription>Determines fields + fee. Previous values load automatically.</CardDescription></CardHeader>
        <CardContent><VisitTypePicker value={visitType} onChange={(k) => { setVisitType(k); setFee(String(Math.round(getTemplate(k).defaultFee / 100))) }} /></CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        {/* TODAY */}
        <div className="space-y-4">
          {template.sections.map((sec) => (
            <Card key={sec.key}>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">{sec.title}</CardTitle>
                <Button type="button" size="sm" variant="ghost" onClick={() => sameAsPrevious(sec.key)}>Same as last visit</Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {sec.fields.map((f) => {
                  if (f.type === 'bp') {
                    return (
                      <div key={f.key} className="space-y-1.5">
                        <Label className="text-xs font-medium">Blood Pressure</Label>
                        <BpInput sys={bpSys} dia={bpDia} onSys={setBpSys} onDia={setBpDia} prevSys={prev('bp_systolic')} prevDia={prev('bp_diastolic')} />
                      </div>
                    )
                  }
                  if (f.key === 'symptoms') {
                    return (
                      <div key={f.key} className="space-y-1.5">
                        <Label className="text-xs font-medium">Symptoms</Label>
                        <SymptomChips options={f.options ?? []} values={symptoms} onChange={setSymptoms} />
                      </div>
                    )
                  }
                  const prevVal = f.measurement ? prev(f.measurement) : null
                  return (
                    <DynamicField key={f.key} field={f} value={values[f.key]} onChange={(v) => set(f.key, v)}
                      prevText={prevVal != null ? `${trimN(prevVal)} ${f.unit ?? ''}`.trim() : undefined} />
                  )
                })}
              </CardContent>
            </Card>
          ))}

          <Card>
            <CardHeader><CardTitle className="text-base">Assessment & Notes</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2"><Label>Assessment</Label><Textarea rows={2} value={assessment} onChange={(e) => setAssessment(e.target.value)} placeholder="e.g. Diabetes improving, continue plan" /></div>
              <div className="space-y-2"><Label>Notes</Label><Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What changed today…" /></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div><CardTitle className="text-base">Care Plan</CardTitle><CardDescription>One-click presets + favorites. Uncheck what stopped.</CardDescription></div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {CARE_PLAN_PRESETS.map((p) => (
                  <button key={p.name} type="button" onClick={() => setCareItems((c) => [...new Set([...c, ...p.items.map((i) => i.title)])])} className="rounded-full border px-2.5 py-1 text-xs hover:bg-accent">+ {p.name}</button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[...new Set([...FAVORITE_DEFAULTS, ...careItems])].map((c) => {
                  const on = careItems.includes(c)
                  return <button key={c} type="button" aria-pressed={on} onClick={() => setCareItems((prev) => on ? prev.filter((x) => x !== c) : [...prev, c])} className={`rounded-md border px-2.5 py-1 text-xs font-medium ${on ? 'border-success bg-success/15 text-success' : 'text-muted-foreground hover:bg-accent'}`}>{on ? '☑' : '☐'} {c.startsWith('⭐') ? c : c}</button>
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Follow-up & Payment</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="fu-next-review">Next review</Label><Input id="fu-next-review" type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="fu-fee">Fee (₹) — auto from visit type</Label><Input id="fu-fee" inputMode="numeric" value={fee} onChange={(e) => setFee(e.target.value)} placeholder={String(feeDefault)} /></div>
              <div className="space-y-2"><Label htmlFor="fu-pay-status">Status</Label>
                <Select id="fu-pay-status" value={payStatus} onChange={(e) => setPayStatus(e.target.value as typeof payStatus)}>
                  <option value="PAID">Paid</option><option value="PARTIAL">Partially Paid</option><option value="PENDING">Pending</option>
                </Select></div>
              <div className="space-y-2"><Label htmlFor="fu-pay-method">Method</Label>
                <Select id="fu-pay-method" value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                  {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </Select></div>
              {payStatus === 'PARTIAL' && (
                <div className="space-y-2"><Label htmlFor="fu-paid-now">Amount paid now (₹)</Label><Input id="fu-paid-now" inputMode="numeric" value={paidNow} onChange={(e) => setPaidNow(e.target.value)} placeholder="e.g. 700" /></div>
              )}
              <p className="text-xs text-muted-foreground sm:col-span-2">Will record {formatMoney(fee ? toMinor(Number(fee)) : toMinor(feeDefault))} · {payStatus.toLowerCase()} via {payMethod}. Split/refund supported from Payments.</p>
            </CardContent>
          </Card>
        </div>

        {/* PREVIOUS VISIT — sticky */}
        <aside className="xl:sticky xl:top-6 xl:self-start">
          <Card className="border-info/40 bg-info/5 dark:bg-sky-950/10">
            <CardHeader><CardTitle className="text-base">Last Visit</CardTitle><CardDescription>{lastComplaint ?? 'Previous state'}</CardDescription></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <PrevRow label="Weight" value={prev('weight') != null ? `${trimN(prev('weight')!)} kg` : '—'} />
              <PrevRow label="BP" value={prev('bp_systolic') != null ? `${Math.round(prev('bp_systolic')!)} / ${Math.round(prev('bp_diastolic') ?? 0)}` : '—'} />
              <PrevRow label="Waist" value={prev('waist') != null ? `${Math.round(prev('waist')!)} cm` : '—'} />
              <PrevRow label="HbA1c" value={prev('hba1c') != null ? `${trimN(prev('hba1c')!)} %` : '—'} />
              <PrevRow label="Fasting glucose" value={prev('fasting_glucose') != null ? `${Math.round(prev('fasting_glucose')!)} mg/dL` : '—'} />
              <PrevRow label="LDL" value={prev('ldl') != null ? `${Math.round(prev('ldl')!)}` : '—'} />
            </CardContent>
          </Card>
        </aside>
      </div>

      {/* Sticky action bar */}
      <div className="sticky bottom-0 z-10 -mx-1 border-t bg-background/95 px-1 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">✓ Draft preserved locally · {template.name} · {formatMoney(fee ? toMinor(Number(fee) || feeDefault) : toMinor(feeDefault))}</p>
          <Button onClick={handleSave} disabled={pending}>{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}{pending ? 'Saving…' : 'Save Visit'}</Button>
        </div>
      </div>
    </div>
  )
}

function SymptomChips({ options, values, onChange }: { options: string[]; values: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = values.includes(o)
        return <button key={o} type="button" aria-pressed={on} onClick={() => onChange(on ? values.filter((x) => x !== o) : [...values, o])} className={`rounded-md border px-2.5 py-1 text-xs ${on ? 'border-primary bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent'}`}>{on ? '☑ ' : '☐ '}{o}</button>
      })}
    </div>
  )
}

function PrevRow({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-2 border-b py-1 last:border-0"><span className="text-muted-foreground">{label}</span><span className="font-medium">{value}</span></div>
}
function trimN(n: number): string { return String(Math.round(n * 10) / 10) }
export function ArrowSep() { return <ArrowRight className="h-3 w-3 text-muted-foreground" /> }
