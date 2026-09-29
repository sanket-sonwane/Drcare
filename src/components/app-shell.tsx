"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { HeartPulse, LayoutDashboard, Users, CalendarDays, Wallet, BarChart3, Settings, Menu, X } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import type { Clinic, User } from "@/types"
import { Avatar } from "@/components/ui/avatar"
import { signOutAction } from "@/lib/auth-actions"

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/patients", label: "Patients", icon: Users },
  { href: "/appointments", label: "Appointments", icon: CalendarDays },
  { href: "/payments", label: "Payments", icon: Wallet },
  { href: "/insights", label: "Insights", icon: BarChart3 },
]

export function AppShell({
  children,
  user,
  clinic,
}: {
  children: React.ReactNode
  user: User
  clinic: Clinic
}) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const NavContent = (
    <>
      <div className="flex items-center gap-3 px-2 pb-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <HeartPulse className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold">DoctorCare</p>
          <p className="text-xs text-muted-foreground">{clinic.name}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1" aria-label="Main navigation">
        {NAV.map((item) => {
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
              aria-current={active ? "page" : undefined}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}

        <Link
          href="/settings"
          onClick={() => setOpen(false)}
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            pathname.startsWith("/settings")
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          )}
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
      </nav>

      <div className="mt-6 border-t pt-4">
        <div className="flex items-center gap-3 px-2">
          <Avatar name={user.name} />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.role === "DOCTOR" ? user.specialty ?? "Doctor" : user.role.toLowerCase()}</p>
          </div>
        </div>
        <form action={signOutAction} onClick={() => setOpen(false)} className="mt-2">
          <button
            type="submit"
            className="w-full rounded-md px-3 py-2 text-left text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            Sign out
          </button>
        </form>
      </div>
    </>
  )

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-card px-3 py-6 lg:flex">
        {NavContent}
      </aside>

      {/* Mobile: sidebar drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setOpen(false)} aria-hidden />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col overflow-y-auto bg-card px-3 py-6 shadow-xl">
            <button
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            {NavContent}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="flex items-center justify-between border-b bg-card px-4 py-3 lg:hidden">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="text-sm font-semibold">DoctorCare</span>
          </div>
          <Avatar name={user.name} className="h-8 w-8 text-xs" />
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-8 lg:px-10 lg:py-8">{children}</main>
      </div>
    </div>
  )
}