import { NextResponse } from "next/server"
import { draftConsultation, summarizeStory } from "@/lib/ai"

export async function POST(req: Request) {
  let body: { action?: string; context?: unknown } = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  switch (body.action) {
    case "draft-consultation":
      return NextResponse.json(await draftConsultation((body.context ?? {}) as Parameters<typeof draftConsultation>[0]))
    case "summarize-story":
      return NextResponse.json({ summary: await summarizeStory((body.context ?? {}) as Parameters<typeof summarizeStory>[0]) })
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  }
}