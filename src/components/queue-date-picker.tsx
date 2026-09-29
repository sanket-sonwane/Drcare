"use client"

export function QueueDatePicker({ defaultValue }: { defaultValue: string }) {
  return (
    <input
      type="date"
      name="date"
      defaultValue={defaultValue}
      onChange={(e) => e.target.form?.requestSubmit()}
      className="h-9 rounded-md border border-border bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label="Queue date"
    />
  )
}