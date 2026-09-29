import { Suspense } from "react"
import { HeartPulse } from "lucide-react"
import { demoLogin, loginAction } from "@/lib/auth-actions"
import { isLive } from "@/lib/db"

export const metadata = { title: "Sign in" }

function ErrorNote({ error }: { error?: string }) {
  if (!error) return null
  return (
    <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
      {error}
    </div>
  )
}

export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  const sp = await searchParams
  return (
    <Suspense>
      <LoginForm error={typeof sp?.error === "string" ? sp.error : undefined} />
    </Suspense>
  )
}

function LoginForm({ error }: { error?: string }) {
  return (
    <div className="w-full max-w-sm animate-fade-in-up">
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
          <HeartPulse className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">DoctorCare</h1>
          <p className="mt-1 text-sm text-muted-foreground">Know every patient&apos;s story. At a glance.</p>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <ErrorNote error={error} />
        <form action={loginAction} className="mt-4 space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-9"
              placeholder="you@clinic.com"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-9"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            className="inline-flex h-11 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-9"
          >
            Sign in
          </button>
        </form>

        {!isLive() && (
          <div className="mt-4 border-t pt-4">
            <form action={demoLogin}>
              <button
                type="submit"
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-input bg-background px-4 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent sm:h-9"
              >
                <span aria-hidden>⚡</span> Explore the live demo
              </button>
            </form>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Demo mode — every screen is populated with sample clinic data.
            </p>
          </div>
        )}
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to DoctorCare?{" "}
        <a href="/signup" className="font-medium text-primary hover:underline">
          Create your clinic
        </a>
      </p>
    </div>
  )
}