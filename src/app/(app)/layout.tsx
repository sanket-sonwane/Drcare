import { redirect } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { getClinic, getSessionUser } from "@/lib/data"

export const dynamic = "force-dynamic"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser()
  if (!user) redirect("/login")

  const clinic = await getClinic()

  return <AppShell user={user} clinic={clinic}>{children}</AppShell>
}