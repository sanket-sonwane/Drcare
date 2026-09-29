"use client"

import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts"

const DEMO = [
  { bucket: "Recovered", count: 2 },
  { bucket: "Improving", count: 5 },
  { bucket: "Stable", count: 4 },
  { bucket: "No response", count: 1 },
  { bucket: "Worsened", count: 0 },
]

const FILL = ["var(--success)", "var(--info)", "var(--muted-foreground)", "var(--warning)", "var(--destructive)"]

const tooltipStyle = {
  background: "var(--popover)",
  color: "var(--popover-foreground)",
  border: "1px solid var(--border)",
  borderRadius: "8px",
  fontSize: "12px",
  boxShadow: "0 8px 24px hsl(222 47% 12% / 0.08)",
}

export function OutcomesChart({ data }: { data?: { bucket: string; count: number }[] }) {
  const rows = data && data.length ? data : DEMO
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
          <XAxis dataKey="bucket" tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)" }} className="text-xs" />
          <YAxis tickLine={false} axisLine={false} allowDecimals={false} tick={{ fill: "var(--muted-foreground)" }} className="text-xs" />
          <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.4 }} contentStyle={tooltipStyle} />
          <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={40}>
            {rows.map((_, i) => (
              <Cell key={i} fill={FILL[i % FILL.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}