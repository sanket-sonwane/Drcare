"use client"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import type { VisitFieldDef } from "@/types"

/** Pick-first controls: chips, segmented, multi-select, bp, slider, numeric. */

export function SegmentedControl({ options, value, onChange }: { options: string[]; value?: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={value === o}
          onClick={() => onChange(o)}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            value === o
              ? "border-primary bg-primary text-primary-foreground"
              : "bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
          )}
        >
          {o}
        </button>
      ))}
    </div>
  )
}

export function ChipMultiSelect({ options, values, onChange }: { options: string[]; values: string[]; onChange: (v: string[]) => void }) {
  function toggle(o: string) {
    onChange(values.includes(o) ? values.filter((x) => x !== o) : [...values, o])
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = values.includes(o)
        return (
          <button
            key={o}
            type="button"
            aria-pressed={on}
            onClick={() => toggle(o)}
            className={cn(
              "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
              on
                ? "border-success bg-success/15 text-success dark:bg-emerald-950/30 dark:text-emerald-300"
                : "bg-card text-muted-foreground hover:bg-accent"
            )}
          >
            {on ? "☑ " : "☐ "}{o}
          </button>
        )
      })}
    </div>
  )
}

export function BpInput({ sys, dia, onSys, onDia, prevSys, prevDia }: { sys: string; dia: string; onSys: (v: string) => void; onDia: (v: string) => void; prevSys?: number | null; prevDia?: number | null }) {
  return (
    <div className="flex items-center gap-2">
      <Input value={sys} onChange={(e) => onSys(e.target.value)} inputMode="numeric" className="h-9 w-20 text-center" placeholder={prevSys != null ? String(Math.round(prevSys)) : "132"} aria-label="Systolic" />
      <span className="text-muted-foreground">/</span>
      <Input value={dia} onChange={(e) => onDia(e.target.value)} inputMode="numeric" className="h-9 w-20 text-center" placeholder={prevDia != null ? String(Math.round(prevDia)) : "82"} aria-label="Diastolic" />
      {(prevSys != null || prevDia != null) && (
        <span className="text-xs text-muted-foreground">prev {prevSys ?? "—"}/{prevDia ?? "—"}</span>
      )}
    </div>
  )
}

export function FieldShell({ label, prev, children, action }: { label: string; prev?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs font-medium">{label}</Label>
        {action}
      </div>
      {children}
      {prev && <p className="text-[11px] text-muted-foreground">Previously: {prev}</p>}
    </div>
  )
}

export function DynamicField({ field, value, onChange, prevText }: { field: VisitFieldDef; value: unknown; onChange: (v: unknown) => void; prevText?: string }) {
  const v = value as never
  switch (field.type) {
    case 'segmented':
      return (
        <FieldShell label={field.label} prev={prevText}>
          <SegmentedControl options={field.options ?? []} value={v as string} onChange={onChange} />
        </FieldShell>
      )
    case 'multiselect':
    case 'chips':
    case 'tags':
      return (
        <FieldShell label={field.label} prev={prevText}>
          <ChipMultiSelect options={field.options ?? []} values={(v as string[]) ?? []} onChange={onChange} />
        </FieldShell>
      )
    case 'slider':
      return (
        <FieldShell label={`${field.label}${v != null && v !== '' ? `: ${String(v)}` : ''}`} prev={prevText}>
          <Slider value={[Number(v ?? 0)]} min={field.min ?? 0} max={field.max ?? 10} step={1} onValueChange={([n]) => onChange(n)} />
        </FieldShell>
      )
    case 'number':
      return (
        <FieldShell label={field.unit ? `${field.label} (${field.unit})` : field.label} prev={prevText}>
          <Input value={String(v ?? '')} onChange={(e) => onChange(e.target.value)} inputMode="decimal" className="h-9 max-w-40" placeholder={field.placeholder ?? prevText ?? ''} />
        </FieldShell>
      )
    case 'date':
      return (
        <FieldShell label={field.label} prev={prevText}>
          <Input type="date" value={String(v ?? '')} onChange={(e) => onChange(e.target.value)} className="h-9 max-w-52" />
        </FieldShell>
      )
    default:
      return (
        <FieldShell label={field.label} prev={prevText}>
          <Input value={String(v ?? '')} onChange={(e) => onChange(e.target.value)} className="h-9" placeholder={field.placeholder ?? ''} />
        </FieldShell>
      )
  }
}
