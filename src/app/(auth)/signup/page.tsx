import { HeartPulse } from "lucide-react"
import { signupFormAction } from "@/lib/auth-actions"
import { isLive } from "@/lib/db"

export const metadata = { title: "Create your clinic" }

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const sp = await searchParams
  const error = sp?.error
  return (
    <div className="w-full max-w-sm animate-fade-in-up">
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
          <HeartPulse className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">DoctorCare</h1>
          <p className="mt-1 text-sm text-muted-foreground">Set up your clinic workspace in under a minute.</p>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        {error ? (
          <div className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
            {error}
          </div>
        ) : null}
        <form action={signupFormAction} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Your name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Dr. Sharma"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="clinic" className="text-sm font-medium">
              Clinic name
            </label>
            <input
              id="clinic"
              name="clinic"
              type="text"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Sharma Clinic"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="specialty" className="text-sm font-medium">
              Specialty <span className="text-muted-foreground">(optional)</span>
            </label>
            <input
              id="specialty"
              name="specialty"
              type="text"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Orthopaedics"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
              minLength={8}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="At least 8 characters"
            />
          </div>
          <button
            type="submit"
            className="inline-flex h-9 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {isLive() ? "Create clinic & account" : "Start (demo workspace)"}
          </button>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <a href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </a>
      </p>
    </div>
  )
}