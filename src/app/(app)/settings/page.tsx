import { Building2, User as UserIcon, FlaskConical } from "lucide-react"
import { getClinic, getSessionUser } from "@/lib/data"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Avatar } from "@/components/ui/avatar"
import { STATUS_VARIANT } from "@/lib/constants"
import { StatusBadge } from "@/components/ui/status-badge"

export const metadata = { title: "Settings" }

export default async function SettingsPage() {
  const [user, clinic] = await Promise.all([getSessionUser(), getClinic()])

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Clinic and account information</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4 text-primary" /> Clinic
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Row label="Name" value={clinic.name} />
          <Row label="Specialty" value={clinic.specialty ?? "—"} />
          <Row label="Phone" value={clinic.phone ?? "—"} />
          <Row label="Address" value={clinic.address ?? "—"} />
          <Row label="Timezone" value={clinic.timezone} />
          <Row label="Currency" value={clinic.currency} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserIcon className="h-4 w-4 text-primary" /> Your Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Avatar name={user?.name ?? "Dr"} surname={undefined} />
            <div>
              <p className="font-medium">{user?.name}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
            {user?.role && (
              <StatusBadge
                status={user.role}
                label={user.role}
                variant={STATUS_VARIANT[user.role]}
              />
            )}
          </div>
          <Row label="Phone" value={user?.phone ?? "—"} />
          <Row label="Specialty" value={user?.specialty ?? "—"} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FlaskConical className="h-4 w-4 text-primary" /> Demo Mode
          </CardTitle>
          <CardDescription>
            You&apos;re exploring DoctorCare with sample data and no external services.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            Set <code className="rounded bg-muted px-1 py-0.5">NEXT_PUBLIC_DEMO_MODE=false</code> and connect
            Supabase + PostgreSQL in <code className="rounded bg-muted px-1 py-0.5">.env</code> to go live with your own
            clinic data. Reference <code className="rounded bg-muted px-1 py-0.5">.env.example</code> for all variables.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/60 pb-2.5 last:border-0">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-right font-medium">{value}</dd>
    </div>
  )
}