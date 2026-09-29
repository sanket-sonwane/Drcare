"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Search, User as UserIcon } from "lucide-react"
import { searchPatients } from "@/lib/client-actions"
import type { SearchResult } from "@/types"
import { formatDate, fullName } from "@/lib/utils"
import { cn } from "@/lib/utils"

export function PatientSearch({ placeholder = "Search patients…", autoFocus = false }: { placeholder?: string; autoFocus?: boolean }) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [])

  function handleChange(v: string) {
    setQuery(v)
    if (!v.trim()) {
      setResults([])
      setOpen(false)
    }
  }

  useEffect(() => {
    const q = query.trim()
    if (q.length < 1) return
    let cancelled = false
    const t = setTimeout(async () => {
      setLoading(true)
      const r = await searchPatients(q)
      if (!cancelled) {
        setResults(r)
        setOpen(true)
        setLoading(false)
      }
    }, 150)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [query])

  return (
    <div ref={boxRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="flex h-9 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Search patients"
        />
      </div>

      {open && (
        <div className="absolute z-40 mt-2 w-full overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-lg">
          {loading ? (
            <div className="space-y-1 p-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-8 animate-pulse rounded-md bg-muted" />
              ))}
            </div>
          ) : results.length === 0 ? (
            <p className="px-3 py-4 text-center text-sm text-muted-foreground">
              No patients match “{query}”
            </p>
          ) : (
            <ul className="max-h-72 overflow-auto p-1">
              {results.map((r) => (
                <li key={r.patient.id}>
                  <Link
                    href={`/patients/${r.patient.id}`}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-accent"
                    )}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                      <UserIcon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{fullName(r.patient)}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {r.patient.patientCode}
                        {r.currentIssue ? ` · ${r.currentIssue}` : ""}
                        {r.lastVisit ? ` · Last visit ${formatDate(r.lastVisit)}` : ""}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}