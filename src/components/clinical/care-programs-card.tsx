"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Plus } from "lucide-react"
import type { CarePackage, PackageEnrollment, Patient } from "@/types"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { formatMoney } from "@/lib/utils"
import { enrollInPackageAction } from "@/lib/client-actions"

/** PRD §71-73 — care packages with live enrollments + sign-up. */
export function CareProgramsCard({
  packages,
  enrollments,
  patients,
}: {
  packages: CarePackage[]
  enrollments: PackageEnrollment[]
  patients: Pick<Patient, 'id' | 'firstName' | 'lastName' | 'patientCode'>[]
}) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [pkgId, setPkgId] = useState(packages[0]?.id ?? '')
  const [patientId, setPatientId] = useState(patients[0]?.id ?? '')
  const router = useRouter()

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!pkgId || !patientId) {
      toast.error('Choose a program and a patient')
      return
    }
    startTransition(async () => {
      try {
        await enrollInPackageAction({ patientId, packageId: pkgId })
        toast.success('✓ Enrolled')
        setOpen(false)
        router.refresh()
      } catch {
        toast.error('Could not enroll')
      }
    })
  }

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
      <div className="flex items-center justify-between p-4">
        <div>
          <p className="font-semibold">Care Programs</p>
          <p className="text-sm text-muted-foreground">Package billing — visits linked to a program</p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Enroll Patient</Button>
      </div>

      {enrollments.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-muted-foreground">No active enrollments. Sign a patient up to a care package to start tracking package billing.</p>
      ) : (
        <div className="grid gap-3 p-4 pt-0 lg:grid-cols-2">
          {enrollments.map((e) => {
            const pkg = e.package
            const name = pkg?.name ?? 'Care Program'
            const progress = pkg ? Math.round((e.visitsCompleted / pkg.visitCount) * 100) : 0
            const weeks = [0, 2, 4, 8, 12].map((w) => e.visitsCompleted > w / 2 ? '✓' : '○')
            return (
              <div key={e.id} className="space-y-2 rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{name}</p>
                    <p className="text-sm text-muted-foreground">
                      Package {formatMoney(e.price)} · Paid {formatMoney(e.paidAmount)} · Remaining {formatMoney(e.price - e.paidAmount)}
                    </p>
                  </div>
                  <LinkPatient id={e.patientId} patients={patients} />
                </div>
                <div className="text-xs text-muted-foreground">Visit {e.visitsCompleted}/{pkg?.visitCount ?? '—'} · {progress}%</div>
                <div className="h-1.5 overflow-hidden rounded-full bg-primary/20">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, progress)}%` }} />
                </div>
                {name === '12-Week Metabolic Program' && (
                  <div className="flex gap-5 text-xs text-muted-foreground">
                    <span>{weeks[0]} Week 0</span><span>{weeks[1]} Week 2</span><span>{weeks[2]} Week 4</span><span>{weeks[3]} Week 8</span><span>{weeks[4]} Week 12</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm" onClick={() => setOpen(false)} role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-lg border bg-card p-6 text-card-foreground shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold">Enroll Patient to a Care Program</h2>
            <form onSubmit={onSubmit} className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cp-patient">Patient</Label>
                <Select id="cp-patient" value={patientId} onChange={(e) => setPatientId(e.target.value)}>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>{p.firstName} {p.lastName ?? ''} · {p.patientCode}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cp-package">Program</Label>
                <Select id="cp-package" value={pkgId} onChange={(e) => setPkgId(e.target.value)}>
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
    </div>
  )
}

function LinkPatient({ id, patients }: { id: string; patients: Pick<Patient, 'id' | 'firstName' | 'lastName' | 'patientCode'>[] }) {
  return (
    <span className="text-sm">
      <a href={`/patients/${id}`} className="font-medium text-primary hover:underline">
        {patients.find((p) => p.id === id) ? `${patients.find((p) => p.id === id)!.firstName} ${patients.find((p) => p.id === id)!.lastName ?? ''}`.trim() : 'Patient'}
      </a>
    </span>
  )
}