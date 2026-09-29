import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Amounts are stored in minor units (paise). 80000 → ₹800
export function formatMoney(amountMinor: number, currency = 'INR'): string {
  const n = amountMinor / 100
  if (currency === 'INR') {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: n % 1 === 0 ? 0 : 2,
    }).format(n)
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: n % 1 === 0 ? 0 : 2,
  }).format(n)
}

export function toMinor(amount: number): number {
  return Math.round(amount * 100)
}

export function formatDate(d: string | Date | null | undefined, fmt = 'dd MMM yyyy'): string {
  if (!d) return '—'
  const date = typeof d === 'string' ? new Date(d) : d
  if (Number.isNaN(date.getTime())) return '—'
  return format(date, fmt)
}

export function formatDateTime(d: string | Date | null | undefined): string {
  if (!d) return '—'
  const date = typeof d === 'string' ? new Date(d) : d
  if (Number.isNaN(date.getTime())) return '—'
  return format(date, 'dd MMM yyyy, h:mm a')
}

export function timeAgo(d: string | Date | null | undefined): string {
  if (!d) return '—'
  const date = typeof d === 'string' ? new Date(d) : d
  if (Number.isNaN(date.getTime())) return '—'
  return formatDistanceToNow(date, { addSuffix: true })
}

export function getAge(dateOfBirth?: string | null): number | null {
  if (!dateOfBirth) return null
  const dob = new Date(dateOfBirth)
  const now = new Date()
  if (Number.isNaN(dob.getTime())) return null
  let age = now.getFullYear() - dob.getFullYear()
  const m = now.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--
  return age
}

export function initials(firstName: string, lastName?: string | null): string {
  return `${firstName.charAt(0)}${lastName?.charAt(0) ?? ''}`.toUpperCase() || '?'
}

export function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good Morning'
  if (h < 17) return 'Good Afternoon'
  return 'Good Evening'
}

export function fullName(p: { firstName: string; lastName?: string | null }): string {
  return [p.firstName, p?.lastName].filter(Boolean).join(' ')
}

export function patientCodePrefix(): string {
  return `P${Date.now().toString().slice(-5)}`
}

export function uid(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}