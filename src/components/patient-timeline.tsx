"use client"

import { useMemo, useState } from "react"
import { Search, Filter } from "lucide-react"
import type { TimelineEntry, TimelineKind } from "@/lib/timeline"
import { groupTimelineByDay } from "@/lib/timeline"
import { cn } from "@/lib/utils"
import { EmptyState } from "@/components/ui/empty-state"
import { formatDate } from "@/lib/utils"

type GroupFilter = "ALL" | "CLINICAL" | "MEASUREMENTS" | "TREATMENTS" | "REPORTS" | "PAYMENTS" | "APPOINTMENTS"

const FILTERS: { value: GroupFilter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "CLINICAL", label: "Clinical" },
  { value: "MEASUREMENTS", label: "Measurements" },
  { value: "TREATMENTS", label: "Treatments" },
  { value: "REPORTS", label: "Reports" },
  { value: "PAYMENTS", label: "Payments" },
  { value: "APPOINTMENTS", label: "Appointments" },
]

function kindMatchesFilter(kind: TimelineKind, filter: GroupFilter): boolean {
  switch (filter) {
    case "ALL":
      return true
    case "CLINICAL":
    case "REPORTS":
      return ["CONSULTATION", "SYMPTOM", "ASSESSMENT", "OUTCOME", "NOTE"].includes(kind)
    case "MEASUREMENTS":
      return kind === "MEASUREMENT"
    case "TREATMENTS":
      return kind === "TREATMENT"
    case "PAYMENTS":
      return kind === "PAYMENT"
    case "APPOINTMENTS":
      return kind === "APPOINTMENT" || kind === "FOLLOWUP"
    default:
      return true
  }
}

export function TimelineView({ entries }: { entries: TimelineEntry[] }) {
  const [filter, setFilter] = useState<GroupFilter>("ALL")
  const [query, setQuery] = useState("")
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return entries.filter((e) => {
      if (!kindMatchesFilter(e.kind, filter)) return false
      if (!q) return true
      const haystack = [e.title, e.description, e.groupLabel, ...Object.entries(e.meta ?? {}).flatMap(([k, v]) => [k, String(v ?? "")])]
        .join(" ")
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [entries, filter, query])

  const days = useMemo(() => groupTimelineByDay(filtered), [filtered])

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                filter === f.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-card hover:bg-accent"
              )}
              aria-pressed={filter === f.value}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative sm:ml-auto sm:w-56">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search history…"
            className="h-11 w-full rounded-md border border-border bg-background pl-8 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-8"
            aria-label="Search within patient history"
          />
        </div>
      </div>

      {days.length === 0 ? (
        <EmptyState
          icon={Filter}
          title="No events match"
          description="Try clearing the search or choosing a different filter."
        />
      ) : (
        <ol className="relative space-y-8 border-l border-border pl-6">
          {days.map((day) => (
            <li key={day.date} className="relative">
              <span
                aria-hidden
                className="absolute -left-[31px] top-0 h-3 w-3 rounded-full border-2 border-primary bg-background"
              />
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {day.label}
              </p>
              <div className="space-y-3">
                {day.groups.map((group, gi) => {
                  const groupId = `${day.date}-${gi}`
                  const open = expanded.has(groupId)
                  const first = group[0]
                  return (
                    <div key={groupId} className="rounded-lg border bg-card shadow-sm">
                      <button
                        onClick={() => toggle(groupId)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left"
                        aria-expanded={open}
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-base" aria-hidden>
                          {first.emblem}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold">{first.groupLabel}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {hi(first.title, query)} · {timeOnly(first.occurredAt)}
                          </span>
                        </span>
                        <span className="text-xs text-muted-foreground" aria-hidden>
                          {open ? "▲" : "▼"}
                        </span>
                      </button>
                      {open && (
                        <div className="space-y-2 border-t px-4 py-3">
                          {group.map((entry) => (
                            <div key={entry.id} className="flex gap-3 text-sm">
                              <span className="w-6 shrink-0 text-center" aria-hidden>
                                {entry.emblem}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="font-medium">
                                  <strong>{hi(entry.title, query)}</strong>
                                </p>
                                <p className="mt-0.5 text-muted-foreground">{hi(entry.description, query)}</p>
                                {entry.meta && Object.keys(entry.meta).length > 0 && (
                                  <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 text-xs sm:grid-cols-2">
                                    {Object.entries(entry.meta).map(([k, v]) =>
                                      v === null || v === undefined || v === "" ? null : (
                                        <div key={k} className="flex justify-between gap-3 border-b border-border/50 py-0.5">
                                          <dt className="text-muted-foreground">{k}</dt>
                                          <dd className="text-right font-medium">{hi(String(v), query)}</dd>
                                        </div>
                                      )
                                    )}
                                  </dl>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

function hi(text: string, query: string): React.ReactNode {
  if (!query.trim() || !text) return text
  const q = query.trim()
  const idx = text.toLowerCase().indexOf(q.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded-sm bg-warning/25 px-0.5 text-foreground">{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  )
}

function timeOnly(iso: string): string {
  return formatDate(iso, "hh:mm a")
}