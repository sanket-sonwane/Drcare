"use server"

import { redirect } from "next/navigation"
import { isLive } from "./db"
import { getSupabaseServer } from "./supabase/server"
import { getSessionUser } from "./data"

export async function demoLogin() {
  // Demo mode resolves the current user as the demo doctor automatically.
  redirect("/dashboard")
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "")
  const password = String(formData.get("password") ?? "")

  if (!isLive()) {
    // No backend configured → jump straight to the demo workspace.
    redirect("/dashboard")
  }

  const supabase = await getSupabaseServer()
  if (!supabase) redirect("/dashboard")

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`)
  }
  redirect("/dashboard")
}

export async function signupFormAction(formData: FormData) {
  const name = String(formData.get("name") ?? "")
  const clinicName = String(formData.get("clinic") ?? "")
  const email = String(formData.get("email") ?? "").toLowerCase().trim()
  const password = String(formData.get("password") ?? "")
  const specialty = String(formData.get("specialty") ?? "")

  if (!isLive()) {
    redirect("/dashboard")
  }

  const supabase = await getSupabaseServer()
  if (!supabase) redirect("/dashboard")

  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`)
  }

  const uid = data.user?.id
  if (uid) {
    // Create clinic + doctor profile so the experience is instantly ready.
    const { getPrisma } = await import("./db")
    const prisma = getPrisma()
    const clinic = await prisma.clinic.create({
      data: {
        name: clinicName || `${name}'s Clinic`,
        specialty: specialty || null,
      },
    })
    await prisma.user.create({
      data: {
        id: uid,
        clinicId: clinic.id,
        name: name || email.split("@")[0],
        email,
        role: "DOCTOR",
      },
    })
  }
  redirect("/dashboard")
}

export async function signOutAction() {
  if (isLive()) {
    const supabase = await getSupabaseServer()
    await supabase?.auth.signOut()
  }
  redirect("/login")
}

export async function requireUserOrRedirect() {
  const user = await getSessionUser()
  if (!user) redirect("/login")
  return user
}