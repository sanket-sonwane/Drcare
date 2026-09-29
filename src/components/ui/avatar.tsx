import { cn } from "@/lib/utils"
import { initials } from "@/lib/utils"

interface AvatarProps {
  name: string
  surname?: string | null
  className?: string
}

export function Avatar({ name, surname, className }: AvatarProps) {
  return (
    <span
      className={cn(
        "inline-flex h-9 w-9 shrink-0 select-none items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground",
        className
      )}
      aria-hidden
    >
      {initials(name, surname)}
    </span>
  )
}