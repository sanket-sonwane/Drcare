import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { getPatientDetail } from "@/lib/data"
import { getMeasurements } from "@/lib/clinical-data"
import { FollowUpVisit } from "@/components/clinical/followup-visit"
import { fullName } from "@/lib/utils"

export const metadata = { title: "Start Follow-up" }

export default async function NewConsultationPage({ params }: PageProps<"/patients/[id]/consultations/new">) {
  const { id } = await params
  const [detail, measurements] = await Promise.all([getPatientDetail(id), getMeasurements(id)])
  if (!detail) notFound()

  const last = detail.consultations[detail.consultations.length - 1]

  return (
    <div className="space-y-6">
      <Link href={`/patients/${id}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to {fullName(detail.patient)}
      </Link>
      <FollowUpVisit
        patientId={detail.patient.id}
        patientName={fullName(detail.patient)}
        measurements={measurements}
        lastComplaint={last?.chiefComplaint ?? null}
      />
    </div>
  )
}