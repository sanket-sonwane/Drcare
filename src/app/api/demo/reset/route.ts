import { NextResponse } from 'next/server'
import { resetDemoStore } from '@/lib/demo-data'

export const dynamic = 'force-dynamic'

// Test-only: reset the in-memory demo store to seed values.
// Guarded so production builds (VERCEL_ENV=production) refuse.
export function GET() {
  if (process.env.VERCEL_ENV === 'production') {
    return NextResponse.json({ ok: false }, { status: 403 })
  }
  resetDemoStore()
  return NextResponse.json({ ok: true })
}