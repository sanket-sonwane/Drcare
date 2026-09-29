"use client"

import Link from "next/link"
import { useTransition } from "react"
import { ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import { createPatientAction } from "@/lib/client-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function NewPatientPage() {
  const [pending, startTransition] = useTransition()

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        await createPatientAction({
          firstName: String(fd.get("firstName") ?? ""),
          lastName: String(fd.get("lastName") ?? "") || undefined,
          dateOfBirth: String(fd.get("dateOfBirth") ?? "") || undefined,
          gender: String(fd.get("gender") ?? "") || undefined,
          phone: String(fd.get("phone") ?? "") || undefined,
          email: String(fd.get("email") ?? "") || undefined,
          address: String(fd.get("address") ?? "") || undefined,
          emergencyContact: String(fd.get("emergencyContact") ?? "") || undefined,
        })
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not save the patient")
      }
    })
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/patients" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Patients
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">New Patient</h1>
        <p className="text-sm text-muted-foreground">Register a patient and begin their care journey.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Patient Information</CardTitle>
            <CardDescription>A unique patient ID will be generated automatically.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">First name</Label>
              <Input id="firstName" name="firstName" required placeholder="Rahul" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" name="lastName" placeholder="Patil" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Date of birth</Label>
              <Input id="dateOfBirth" name="dateOfBirth" type="date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <Select id="gender" name="gender" defaultValue="">
                <option value="">Select…</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" type="tel" placeholder="+91 98XXX XXXXX" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="patient@email.com" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" name="address" placeholder="Address, City" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="emergencyContact">Emergency contact</Label>
              <Input id="emergencyContact" name="emergencyContact" type="tel" />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap justify-end gap-2">
          <Button asChild type="button" variant="outline">
            <Link href="/patients">Cancel</Link>
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Creating…" : "Create Patient"}
          </Button>
        </div>
      </form>
    </div>
  )
}