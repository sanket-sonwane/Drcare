import Link from "next/link"
import { Banknote, Wallet, TrendingUp, Clock } from "lucide-react"
import { getFinancialSummary, listPayments, listPatients } from "@/lib/data"
import { getAllInvoices, getCarePackages, getEnrollments } from "@/lib/billing"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { StatusBadge, variantForStatus, dotForStatus } from "@/components/ui/status-badge"
import { EmptyState } from "@/components/ui/empty-state"
import { CareProgramsCard } from "@/components/clinical/care-programs-card"
import { CsvExportButton } from "@/components/csv-export-button"
import { PAYMENT_METHODS, PAYMENT_STATUS_LABEL } from "@/lib/constants"
import { formatDate, formatMoney, fullName } from "@/lib/utils"

export const metadata = { title: "Payments" }

type Tab = 'today' | 'all' | 'pending' | 'overdue'

export default async function PaymentsPage({ searchParams }: PageProps<"/payments">) {
  const sp = await searchParams
  const tab = ((sp.tab as string) ?? 'today') as Tab
  const [summary, payments, invoices, packages, enrollments, patients] = await Promise.all([
    getFinancialSummary(),
    listPayments(),
    getAllInvoices(),
    getCarePackages(),
    getEnrollments(),
    listPatients(),
  ])
  const invoiceById = new Map(invoices.map((i) => [i.id, i.invoiceNo]))
  const expected = summary.todayCollection + summary.pendingFees

  const cards = [
    { label: "Today's Collection", value: formatMoney(summary.todayCollection), icon: Banknote, tint: "text-success", href: "/payments?tab=today" },
    { label: "Expected Today", value: formatMoney(expected), icon: TrendingUp, tint: "text-primary", href: "/payments?tab=all" },
    { label: "Pending Fees", value: formatMoney(summary.pendingFees), icon: Wallet, tint: "text-warning-foreground", href: "/payments?tab=pending" },
    { label: "Overdue", value: formatMoney(summary.overdueFees), icon: Clock, tint: "text-destructive", href: "/payments?tab=overdue" },
  ]

  const todayStr = new Date().toDateString()
  let rows = payments
  if (tab === 'today') rows = payments.filter((p) => new Date(p.paymentDate).toDateString() === todayStr)
  if (tab === 'pending') rows = payments.filter((p) => p.status === 'PENDING' || p.status === 'PARTIAL' || p.status === 'OVERDUE')
  if (tab === 'overdue') rows = payments.filter((p) => (p.status === 'PENDING' || p.status === 'PARTIAL' || p.status === 'OVERDUE') && new Date(p.paymentDate).getTime() < new Date().setHours(0, 0, 0, 0))

  const byMethod = (['CASH', 'UPI', 'CARD', 'BANK_TRANSFER'] as const).map((m) => ({
    method: m, total: payments.filter((p) => p.method === m && p.status === 'PAID' && new Date(p.paymentDate).toDateString() === todayStr).reduce((s, p) => s + p.amount, 0),
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Payments</h1>
          <p className="text-sm text-muted-foreground">Collected ≠ expected · charges, collections, balances in one place</p>
        </div>
        <CsvExportButton
          filename="payments"
          label="Export"
          headers={['Date', 'Patient', 'Invoice', 'Description', 'Method', 'Status', 'Amount']}
          rows={rows.map((p) => [
            formatDate(p.paymentDate),
            p.patient ? fullName(p.patient) : '',
            p.invoiceId ? invoiceById.get(p.invoiceId) ?? '' : '',
            p.description ?? '',
            p.method,
            p.status,
            String(p.amount),
          ])}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="h-full">
            <Card className="h-full transition-colors hover:bg-accent/40">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">{c.label}</p>
                    <p className="text-2xl font-semibold tracking-tight">{c.value}</p>
                  </div>
                  <span className="rounded-lg border bg-muted/60 p-2"><c.icon className={`h-5 w-5 ${c.tint}`} /></span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Revenue snapshot: collected / expected / pending (§12) + day summary (§70) */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Today</CardTitle><CardDescription>Collected vs expected vs pending</CardDescription></CardHeader>
          <CardContent className="flex flex-wrap gap-6 text-sm">
            <span>Collected <strong className="text-success">{formatMoney(summary.todayCollection)}</strong></span>
            <span>Expected <strong>{formatMoney(expected)}</strong></span>
            <span className="text-warning-foreground">Pending <strong>{formatMoney(summary.pendingFees)}</strong></span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Day Summary — by method</CardTitle><CardDescription>End-of-day reconciliation</CardDescription></CardHeader>
          <CardContent className="flex flex-wrap gap-4 text-sm">
            {byMethod.map((m) => (
              <span key={m.method}>{m.method} <strong>{formatMoney(m.total)}</strong></span>
            ))}
            <span>Total <strong>{formatMoney(byMethod.reduce((s, x) => s + x.total, 0))}</strong></span>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        {([['today', 'Today'], ['all', 'Transactions'], ['pending', 'Pending'], ['overdue', 'Overdue']] as [Tab, string][]).map(([v, l]) => (
          <Link key={v} href={v === 'today' ? '/payments' : `/payments?tab=${v}`} className={`rounded-full border px-3 py-1 text-sm font-medium ${tab === v ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:bg-accent'}`}>{l}</Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{tab === 'pending' ? 'Outstanding Payments' : tab === 'overdue' ? 'Overdue Payments' : tab === 'today' ? "Today's Transactions" : 'Payment Ledger'}</CardTitle>
          <CardDescription>{rows.length} records · Date / Patient / Invoice / Description / Amount / Method / Status / Recorded By</CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <EmptyState icon={Wallet} title={tab === 'pending' || tab === 'overdue' ? 'No outstanding payments' : 'No payments'} description={tab === 'pending' || tab === 'overdue' ? 'All patient balances are clear.' : 'Payments recorded during visits will appear here.'} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Patient</th>
                    <th className="px-4 py-3 font-medium">Invoice</th>
                    <th className="px-4 py-3 font-medium">Description</th>
                    <th className="px-4 py-3 font-medium">Method</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">Amount</th>
                    <th className="px-4 py-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p) => (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(p.paymentDate)}</td>
                      <td className="px-4 py-3"><Link href={`/patients/${p.patientId}`} className="font-medium hover:underline">{p.patient ? fullName(p.patient) : "Patient"}</Link></td>
                      <td className="px-4 py-3 font-medium">{p.invoiceId ? invoiceById.get(p.invoiceId) ?? '—' : '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.description ?? "Payment"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{PAYMENT_METHODS.find((m) => m.value === p.method)?.label ?? p.method}</td>
                      <td className="px-4 py-3"><StatusBadge status={p.status} label={PAYMENT_STATUS_LABEL[p.status]} variant={variantForStatus(p.status)} dotClassName={dotForStatus(p.status)} /></td>
                      <td className="px-4 py-3 text-right font-medium">{formatMoney(p.amount)}</td>
                      <td className="px-4 py-3"><Link href={`/patients/${p.patientId}`} className="text-xs font-medium text-primary hover:underline">{p.status === 'PENDING' || p.status === 'PARTIAL' || p.status === 'OVERDUE' ? 'Collect' : 'View'}</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Care Programs (§71-73) — live enrollments + sign-up */}
      <CareProgramsCard packages={packages} enrollments={enrollments} patients={patients} />
    </div>
  )
}
