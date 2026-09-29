import { Users, Stethoscope, Banknote, CalendarClock, Pickaxe } from "lucide-react"
import { getInsightsOverview } from "@/lib/data"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { formatMoney } from "@/lib/utils"
import { RevenueChart } from "@/components/revenue-chart"
import { OutcomesChart } from "@/components/outcomes-chart"

export const metadata = { title: "Insights" }

export default async function InsightsPage() {
  const data = await getInsightsOverview()

  const stats = [
    { label: "Total Patients", value: String(data.totalPatients), sub: `${data.newPatients} new · ${data.returningPatients} returning`, icon: Users },
    { label: "Consultations", value: String(data.consultations), sub: `${data.treatmentsStarted} treatments started`, icon: Stethoscope },
    { label: "Revenue", value: formatMoney(data.revenue), sub: `Avg ₹${Math.round(data.avgConsultationValue)} per consultation`, icon: Banknote },
    { label: "Follow-ups", value: `${data.followUpsCompleted} / ${data.followUpsCompleted + data.pendingFollowUps}`, sub: `${data.followUpRate}% completion rate`, icon: CalendarClock },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Insights</h1>
        <p className="text-sm text-muted-foreground">Practice-level analytics for care quality</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-semibold tracking-tight">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.sub}</p>
                </div>
                <span className="rounded-lg border bg-muted/60 p-2">
                  <s.icon className="h-5 w-5 text-primary" />
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recovery Signals</CardTitle>
            <CardDescription>How patients respond to care</CardDescription>
          </CardHeader>
          <CardContent className="min-w-0">
            <OutcomesChart />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Collections</CardTitle>
            <CardDescription className="flex items-center gap-1">
              Collected <strong>{formatMoney(data.collectedFees)}</strong> · Pending <strong>{formatMoney(data.pendingFees)}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="min-w-0">
            <RevenueChart />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="flex items-center gap-2 font-medium">
                <Pickaxe className="h-4 w-4 text-primary" /> Would you like richer analytics?
              </p>
              <p className="text-sm text-muted-foreground">
                Connect a live database to unlock trend charts over time (revenue by month, symptom frequency, treatment outcomes).
              </p>
            </div>
            <p className="text-xs text-muted-foreground">No-show rate: {data.noShowRate}%</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}