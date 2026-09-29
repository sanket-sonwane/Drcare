"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Mic,
  Sparkles,
  Plus,
  Trash2,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"
import type { Outcome, Payment, Treatment } from "@/types"
import { createConsultationAction } from "@/lib/client-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  PAYMENT_METHODS,
  RESPONSE_LABEL,
  SYMPTOM_OPTIONS,
  TREATMENT_TYPES,
} from "@/lib/constants"
import { cn, formatMoney, toMinor } from "@/lib/utils"

export interface PreviousConsult {
  date?: string | null
  chiefComplaint?: string | null
  assessment?: string | null
  outcomes: Outcome[]
  treatments: Treatment[]
}

const STEPS = ["Intake", "Review", "Assessment", "Plan", "Outcome", "Billing"]

const SEVERITIES = ["MILD", "MODERATE", "SEVERE"] as const

interface SymptomRow {
  name: string
  severity: "MILD" | "MODERATE" | "SEVERE"
  duration: string
}
interface TreatmentRow {
  type: Treatment["type"]
  name: string
  instructions: string
  dosage: string
}
interface OutcomeRow {
  metric: string
  previousValue: string
  currentValue: string
  response: string
}

export function ConsultationWizard({
  patientId,
  patientName,
  currentIssue,
  previous,
}: {
  patientId: string
  patientName: string
  currentIssue: string | null
  previous?: PreviousConsult | null
}) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [pending, startTransition] = useTransition()

  const [chiefComplaint, setChiefComplaint] = useState("")
  const [symptoms, setSymptoms] = useState<SymptomRow[]>([])
  const [assessment, setAssessment] = useState("")
  const [clinicalNotes, setClinicalNotes] = useState("")
  const [treatments, setTreatments] = useState<TreatmentRow[]>([])
  const [outcomes, setOutcomes] = useState<OutcomeRow[]>([])
  const [followUpDate, setFollowUpDate] = useState("")
  const [followUpReason, setFollowUpReason] = useState("")
  const [fee, setFee] = useState("")
  const [paymentStatus, setPaymentStatus] = useState<"PAID" | "PENDING">("PENDING")
  const [paymentMethod, setPaymentMethod] = useState("CASH")
  const [aiBusy, setAiBusy] = useState<string | null>(null)
  const [listening, setListening] = useState(false)

  const isFollowUp = !!previous && previous.outcomes.length > 0

  function next() {
    if (step === 0 && !chiefComplaint.trim() && symptoms.length === 0) {
      toast.error("Describe the complaint or add at least one symptom")
      return
    }
    if (step === 1 && isFollowUp && outcomes.length === 0) {
      toast.error("Record at least one outcome of the previous treatment")
      return
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }
  function back() {
    setStep((s) => Math.max(s - 1, 0))
  }

  async function aiDraft() {
    setAiBusy("draft")
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "draft-consultation",
          context: {
            name: patientName,
            currentIssue: chiefComplaint || currentIssue,
            previousOutcomes: previous?.outcomes ?? [],
            currentTreatments: previous?.treatments ?? [],
          },
        }),
      })
      if (!res.ok) throw new Error("AI assist unavailable")
      const draft = await res.json()
      if (draft.assessment) setAssessment(draft.assessment)
      if (Array.isArray(draft.symptoms)) {
        setSymptoms(draft.symptoms.map((s: { name: string; severity: string; duration?: string }) => ({
          name: s.name,
          severity: (SEVERITIES as readonly string[]).includes(s.severity) ? (s.severity as SymptomRow["severity"]) : "MODERATE",
          duration: s.duration ?? "",
        })))
      }
      if (Array.isArray(draft.treatmentPlan)) {
        setTreatments(draft.treatmentPlan.map((t: { type: string; name: string; instructions?: string }) => ({
          type: (TREATMENT_TYPES.some((x) => x.value === t.type) ? t.type : "THERAPY") as TreatmentRow["type"],
          name: t.name,
          instructions: t.instructions ?? "",
          dosage: "",
        })))
      }
      if (draft.followUpReason) setFollowUpReason(draft.followUpReason)
      toast.success("AI drafted the consultation — please review before saving")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI assist failed")
    } finally {
      setAiBusy(null)
    }
  }

  async function aiSummary() {
    setAiBusy("summary")
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "summarize-story",
          context: {
            name: patientName,
            currentIssue: chiefComplaint || currentIssue,
            previousOutcomes: previous?.outcomes ?? [],
            currentTreatments: previous?.treatments ?? [],
          },
        }),
      })
      const data = await res.json()
      if (data.summary) {
        setClinicalNotes((notes) => (notes ? notes + "\n\n▶ AI patient summary:\n" + data.summary : "▶ AI patient summary:\n" + data.summary))
        toast.success("Summary added to notes — please review")
      }
    } catch {
      toast.error("Summarize failed")
    } finally {
      setAiBusy(null)
    }
  }

  function startVoice() {
    const w = window as unknown as { SpeechRecognition?: new () => unknown; webkitSpeechRecognition?: new () => unknown }
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition
    if (!Ctor) {
      toast.error("Voice input is not supported in this browser")
      return
    }
    const rec = new Ctor() as {
      lang: string
      interimResults: boolean
      onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
      onend: (() => void) | null
      onerror: (() => void) | null
      start: () => void
      stop: () => void
    }
    rec.lang = "en-IN"
    rec.interimResults = true
    rec.onresult = (e) => {
      const text = Array.from(e.results).map((r) => Array.from(r).map((alt) => alt.transcript).join("")).join(" ")
      setChiefComplaint(text)
    }
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)
    setListening(true)
    rec.start()
  }

  function handleSubmit() {
    startTransition(async () => {
      const outcomeRows = isFollowUp && outcomes.length === 0 ? null : outcomes
      try {
        await createConsultationAction({
          patientId,
          chiefComplaint: chiefComplaint.trim() || undefined,
          clinicalNotes: clinicalNotes.trim() || undefined,
          assessment: assessment.trim() || undefined,
          symptoms: symptoms.map((s) => ({ name: s.name, severity: s.severity, duration: s.duration })),
          treatments: treatments.map((t) => ({
            type: t.type,
            name: t.name,
            instructions: t.instructions,
            dosage: t.dosage,
          })),
          outcomes: outcomeRows?.map((o) => ({
            metric: o.metric,
            previousValue: o.previousValue,
            currentValue: o.currentValue,
            response: o.response,
          })),
          followUp: followUpDate ? { scheduledDate: new Date(followUpDate).toISOString(), reason: followUpReason } : null,
          fee: fee ? toMinor(Number(fee)) : undefined,
          paymentStatus: fee ? paymentStatus : undefined,
          paymentMethod: fee ? (paymentMethod as Payment["method"]) : undefined,
        })
        toast.success("Consultation saved")
        router.refresh()
        router.push(`/patients/${patientId}`)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not save consultation")
      }
    })
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Stepper */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1" aria-label="Progress">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => i < step && setStep(i)}
              className={cn(
                "flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                i === step
                  ? "border-primary bg-primary text-primary-foreground"
                  : i < step
                    ? "border-success bg-success/15 text-success"
                    : "bg-card text-muted-foreground"
              )}
            >
              {i < step ? <Check className="h-3 w-3" /> : <span>{i + 1}</span>}
              {s}
            </button>
            {i < STEPS.length - 1 && <span className="h-px w-3 bg-border" aria-hidden />}
          </div>
        ))}
      </div>

      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Start Consultation</h1>
        <p className="text-sm text-muted-foreground">
          {patientName} {isFollowUp ? "· Follow-up visit" : "· First consultation"}
        </p>
      </div>

      {isFollowUp && (
        <Card className="border-info/40 bg-info/5 dark:bg-sky-950/10">
          <CardContent className="space-y-2 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-info">One-Minute Review</p>
              <Button type="button" size="sm" variant="outline" onClick={aiSummary} disabled={aiBusy !== null}>
                {aiBusy === "summary" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                AI summary
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Last visit {previous?.date ? new Date(previous.date).toLocaleDateString() : "—"} ·{" "}
              {previous?.chiefComplaint ?? currentIssue ?? "no issue recorded"}
            </p>
            {previous?.outcomes.map((o) => (
              <p key={o.id} className="text-sm">
                <span className="font-medium">{o.metric}:</span> {o.previousValue ?? "—"} → {o.currentValue ?? "—"} (
                {RESPONSE_LABEL[o.response]})&nbsp;
                <span
                  className={cn(
                    "font-medium",
                    o.response === "IMPROVED" ? "text-success" : o.response === "WORSENED" ? "text-destructive" : "text-warning-foreground"
                  )}
                >
                  ▲
                </span>
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
        {step === 0 && (
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base">What brings you in today?</CardTitle>
                <CardDescription>Record the chief complaint and presenting symptoms.</CardDescription>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={startVoice} disabled={listening}>
                <Mic className={cn("h-4 w-4", listening && "animate-pulse text-destructive")} /> {listening ? "Listening…" : "Voice input"}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="complaint">Chief complaint</Label>
                <Textarea
                  id="complaint"
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                  rows={2}
                  placeholder={currentIssue ?? "e.g. Lower back pain for the past 3 weeks"}
                />
                <div className="flex flex-wrap gap-1.5">
                  {SYMPTOM_OPTIONS.slice(0, 8).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        if (symptoms.some((s) => s.name === opt)) return
                        setSymptoms((prev) => [...prev, { name: opt, severity: "MODERATE", duration: "" }])
                      }}
                      className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground hover:bg-accent"
                    >
                      + {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Symptoms</Label>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setSymptoms((p) => [...p, { name: "", severity: "MODERATE", duration: "" }])}>
                    <Plus className="h-3.5 w-3.5" /> Add symptom
                  </Button>
                </div>
                {symptoms.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No symptoms added — tap a suggestion above or add your own.</p>
                ) : (
                  <div className="space-y-2">
                    {symptoms.map((s, i) => (
                      <div key={i} className="flex flex-wrap items-center gap-2 rounded-md border bg-card p-2">
                        <Input value={s.name} onChange={(e) => updateRow(setSymptoms, i, "name", e.target.value)} className="h-8 w-44" placeholder="Symptom name" />
                        <select
                          value={s.severity}
                          onChange={(e) => updateRow(setSymptoms, i, "severity", e.target.value)}
                          className="h-8 rounded-md border border-border bg-background px-2 text-sm"
                          aria-label="Severity"
                        >
                          {SEVERITIES.map((sev) => (
                            <option key={sev} value={sev}>{sev.toLowerCase()}</option>
                          ))}
                        </select>
                        <Input
                          value={s.duration}
                          onChange={(e) => updateRow(setSymptoms, i, "duration", e.target.value)}
                          className="h-8 w-36"
                          placeholder="Duration (e.g. 3 weeks)"
                        />
                        <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => setSymptoms((prev) => prev.filter((_, x) => x !== i))} aria-label="Remove symptom">
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Response to Last Plan</CardTitle>
              <CardDescription>
                Compare how the patient is doing now versus their last visit. &ldquo;Response&rdquo; feeds the patient&apos;s recovery trend automatically.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {previous?.outcomes.map((o) => (
                <PreviousOutcomeRow key={o.id} metric={o.metric} previous={o.currentValue ?? ""} outcomes={outcomes} setOutcomes={setOutcomes} />
              ))}
              {!previous?.outcomes.length && (
                <p className="text-sm text-muted-foreground">No previous baseline metrics to compare — you can skip this step.</p>
              )}
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base">Assessment & Notes</CardTitle>
                <CardDescription>Your clinical assessment, diagnosis and progress notes.</CardDescription>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={aiDraft} disabled={aiBusy !== null}>
                {aiBusy === "draft" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                AI Assist
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="assessment">Assessment</Label>
                <Textarea id="assessment" rows={3} value={assessment} onChange={(e) => setAssessment(e.target.value)} placeholder="Diagnosis / provisional assessment" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Clinical notes</Label>
                <Textarea id="notes" rows={4} value={clinicalNotes} onChange={(e) => setClinicalNotes(e.target.value)} placeholder="Progress notes, observations…" />
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base">Treatment Plan</CardTitle>
                <CardDescription>Prescribe medications, therapy, exercises or procedures.</CardDescription>
              </div>
              <Button type="button" size="sm" variant="ghost" onClick={() => setTreatments((p) => [...p, { type: "MEDICATION", name: "", instructions: "", dosage: "" }])}>
                <Plus className="h-3.5 w-3.5" /> Add treatment
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {treatments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No treatments yet — tap &ldquo;Add treatment&rdquo; to build the plan.</p>
              ) : (
                treatments.map((t, i) => (
                  <div key={i} className="space-y-2 rounded-md border bg-card p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={t.type}
                        onChange={(e) => updateRow(setTreatments, i, "type", e.target.value)}
                        className="h-8 rounded-md border border-border bg-background px-2 text-sm"
                        aria-label="Treatment type"
                      >
                        {TREATMENT_TYPES.map((tt) => (
                          <option key={tt.value} value={tt.value}>{tt.label}</option>
                        ))}
                      </select>
                      <Input value={t.name} onChange={(e) => updateRow(setTreatments, i, "name", e.target.value)} className="h-8 flex-1" placeholder="Treatment name (e.g. Diclofenac gel)" />
                      <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => setTreatments((prev) => prev.filter((_, x) => x !== i))} aria-label="Remove treatment">
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Input value={t.dosage} onChange={(e) => updateRow(setTreatments, i, "dosage", e.target.value)} className="h-8 w-40" placeholder="Dosage (e.g. 1-0-1)" />
                      <Input value={t.instructions} onChange={(e) => updateRow(setTreatments, i, "instructions", e.target.value)} className="h-8 flex-1" placeholder="Instructions (e.g. apply twice daily)" />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}

        {step === 4 && (
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base">Outcome</CardTitle>
                <CardDescription>Measurable result for this visit — drives the recovery trend.</CardDescription>
              </div>
              <Button type="button" size="sm" variant="ghost" onClick={() => setOutcomes((p) => [...p, { metric: "", previousValue: "", currentValue: "", response: "STABLE" }])}>
                <Plus className="h-3.5 w-3.5" /> Add metric
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {!isFollowUp ? (
                <p className="text-sm text-muted-foreground">
                  This is a first visit — you can still record a baseline metric (e.g. pain score) to track from next time.
                </p>
              ) : null}
              {outcomes.map((o, i) => (
                <div key={i} className="grid grid-cols-1 gap-2 rounded-md border bg-card p-3 sm:grid-cols-[1.2fr_0.6fr_0.6fr_0.9fr_auto] sm:items-center">
                  <Input value={o.metric} onChange={(e) => updateRow(setOutcomes, i, "metric", e.target.value)} className="h-8" placeholder="Metric (e.g. Pain score /10)" />
                  <Input value={o.previousValue} onChange={(e) => updateRow(setOutcomes, i, "previousValue", e.target.value)} className="h-8" placeholder="Prev" />
                  <Input value={o.currentValue} onChange={(e) => updateRow(setOutcomes, i, "currentValue", e.target.value)} className="h-8" placeholder="Now" />
                  <select
                    value={o.response}
                    onChange={(e) => updateRow(setOutcomes, i, "response", e.target.value)}
                    className="h-8 rounded-md border border-border bg-background px-2 text-sm"
                    aria-label="Response"
                  >
                    {(Object.keys(RESPONSE_LABEL) as (keyof typeof RESPONSE_LABEL)[]).map((k) => (
                      <option key={k} value={k} disabled={k === "UNSET"}>{RESPONSE_LABEL[k]}</option>
                    ))}
                  </select>
                  <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => setOutcomes((prev) => prev.filter((_, x) => x !== i))} aria-label="Remove metric">
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              ))}
              {outcomes.length === 0 && (
                <p className="text-sm text-muted-foreground">No metrics recorded.</p>
              )}
            </CardContent>
          </Card>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Follow-up</CardTitle>
                <CardDescription>Schedule the next visit to keep the care journey alive.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fu-date">Follow-up date</Label>
                  <Input id="fu-date" type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fu-reason">Reason</Label>
                  <Input id="fu-reason" value={followUpReason} onChange={(e) => setFollowUpReason(e.target.value)} placeholder="Review progress" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Consultation Fee</CardTitle>
                <CardDescription>Leave blank to skip charging for this visit.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="fee">Amount (₹)</Label>
                  <Input id="fee" type="number" min="0" value={fee} onChange={(e) => setFee(e.target.value)} placeholder="500" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pay-status">Payment status</Label>
                  <Select id="pay-status" value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value as "PAID" | "PENDING")}>
                    <option value="PAID">Paid now</option>
                    <option value="PENDING">Due on visit</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pay-method">Method</Label>
                  <Select id="pay-method" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </Select>
                </div>
              </CardContent>
              {fee && (
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Will record a {paymentStatus === "PAID" ? "paid" : "pending"} charge of{" "}
                    <strong>{formatMoney(toMinor(Number(fee)))}</strong> for this visit.
                  </p>
                </CardContent>
              )}
            </Card>
          </div>
        )}

        {/* Nav + submit */}
        <div className="flex items-center justify-between">
          <Button type="button" variant="outline" onClick={back} disabled={step === 0 || pending}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={next}>
              Continue <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button type="button" onClick={handleSubmit} disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {pending ? "Saving…" : "Save Consultation"}
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}

function updateRow<T>(setter: React.Dispatch<React.SetStateAction<T[]>>, index: number, key: keyof T, value: string) {
  setter((prev) => prev.map((row, i) => (i === index ? { ...row, [key]: value } : row)))
}

function PreviousOutcomeRow({
  metric,
  previous,
  outcomes,
  setOutcomes,
}: {
  metric: string
  previous: string
  outcomes: OutcomeRow[]
  setOutcomes: React.Dispatch<React.SetStateAction<OutcomeRow[]>>
}) {
  const existing = outcomes.find((o) => o.metric === metric)
  const value = existing?.currentValue ?? ""
  const response = existing?.response ?? "STABLE"

  function set(patch: Partial<OutcomeRow>) {
    setOutcomes((prev) => {
      const idx = prev.findIndex((o) => o.metric === metric)
      if (idx === -1) return [...prev, { metric, previousValue: previous, currentValue: "", response: "STABLE", ...patch }]
      return prev.map((o, i) => (i === idx ? { ...o, ...patch } : o))
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border bg-card p-3">
      <span className="w-40 font-medium">{metric}</span>
      <Input value={previous} readOnly className="h-8 w-20 bg-muted text-center" aria-label={`${metric} previous value`} />
      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
      <Input value={value} onChange={(e) => set({ currentValue: e.target.value })} className="h-8 w-20 text-center" placeholder="now" aria-label={`${metric} current value`} />
      <select value={response} onChange={(e) => set({ response: e.target.value })} className="h-8 rounded-md border border-border bg-background px-2 text-sm" aria-label={`${metric} response`}>
        {(Object.keys(RESPONSE_LABEL) as (keyof typeof RESPONSE_LABEL)[]).map((k) => (
          <option key={k} value={k} disabled={k === "UNSET"}>{RESPONSE_LABEL[k]}</option>
        ))}
      </select>
    </div>
  )
}