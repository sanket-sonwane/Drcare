"use client"

import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts"
import { formatMoney } from "@/lib/utils"

const DEMO = [
  { month: "Apr", revenue: 1180000 },
  { month: "May", revenue: 1345000 },
  { month: "Jun", revenue: 1290000 },
  { month: "Jul", revenue: 1520000 },
  { month: "Aug", revenue: 1715000 },
  { month: "Sep", revenue: 1640000 },
]

const tooltipStyle = {
  background: "var(--popover)",
  color: "var(--popover-foreground)",
  border: "1px solid var(--border)",
  borderRadius: "8px",
  fontSize: "12px",
  boxShadow: "0 8px 24px hsl(222 47% 12% / 0.08)",
}

export function RevenueChart({ data }: { data?: { month: string; revenue: number }[] }) {
  const rows = data && data.length ? data : DEMO
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={rows} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
          <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)" }} className="text-xs" />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)" }}
            className="text-xs"
            tickFormatter={(v: number) => `₹${Math.round(v / 100000)}L`}
          />
          <Tooltip
            formatter={(v) => formatMoney(Number(v))}
            labelStyle={{ fontWeight: 600, color: "var(--popover-foreground)" }}
            contentStyle={tooltipStyle}
          />
          <Bar dataKey="revenue" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={32} />
          <Line type="monotone" dataKey="revenue" stroke="var(--primary)" strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}