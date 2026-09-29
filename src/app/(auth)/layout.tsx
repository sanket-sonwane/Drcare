import { redirect } from "next/navigation"
import { getSessionUser } from "@/lib/data"
import { isLive } from "@/lib/db"

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  // Already signed in on a real instance → go straight to the app.
  const user = await getSessionUser()
  if (user && isLive()) redirect("/dashboard")
  return <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">{children}</div>
}