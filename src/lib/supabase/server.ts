import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function getSupabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  const cookieStore = await cookies()
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // Called from a Server Component; safe to ignore when middleware refreshes.
        }
      },
    },
  })
}

/** Returns the Supabase auth user (or null when unconfigured / signed out). */
export async function getServerSession() {
  const supabase = await getSupabaseServer()
  if (!supabase) return null
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}