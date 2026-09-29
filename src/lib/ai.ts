import OpenAI from "openai"

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null

interface PatientContext {
  name: string
  age?: string | null
  gender?: string | null
  currentIssue?: string | null
  previousOutcomes?: { metric: string; previousValue?: string | null; currentValue?: string | null; response: string }[]
  currentTreatments?: { name: string; type: string; status: string; response: string }[]
}

export async function draftConsultation(context: PatientContext) {
  if (openai) {
    try {
      const res = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content:
              "You are a clinical documentation assistant for an orthopedic clinic. " +
              "Draft structured SOAP-style notes. Output strict JSON with keys: " +
              "symptoms (array of {name, severity: MILD|MODERATE|SEVERE, duration}), " +
              "assessment, treatmentPlan (array of {type: MEDICATION|THERAPY|EXERCISE|LIFESTYLE|PROCEDURE|OTHER, name, instructions}), " +
              "followUpReason. Never invent data the doctor did not provide.",
          },
          { role: "user", content: JSON.stringify(context) },
        ],
        response_format: { type: "json_object" },
      })
      const raw = res.choices[0]?.message?.content
      if (raw) return JSON.parse(raw)
    } catch {
      // fall through to template
    }
  }
  return templateDraft(context)
}

function templateDraft(context: PatientContext): Record<string, unknown> {
  const issue = context.currentIssue ?? "the stated problem"
  return {
    symptoms: [{ name: issue, severity: "MODERATE", duration: "1 week" }],
    assessment: `Patient presents with ${issue.toLowerCase()}. Based on the documented history, continue care plan and monitor response to current management.`,
    treatmentPlan: [
      {
        type: "THERAPY",
        name: "Continue current therapy",
        instructions: "Continue prescribed regimen; reassess at next follow-up.",
      },
    ],
    followUpReason: "Review response to ongoing treatment",
  }
}

export async function summarizeStory(context: PatientContext) {
  if (openai) {
    try {
      const res = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content:
              "Summarize a patient's treatment journey in 3-4 plain, doctor-grade sentences for quick review before a consultation. Be concise and clinical.",
          },
          { role: "user", content: JSON.stringify(context) },
        ],
      })
      return res.choices[0]?.message?.content?.trim() ?? fallbackSummary(context)
    } catch {
      return fallbackSummary(context)
    }
  }
  return fallbackSummary(context)
}

function fallbackSummary(context: PatientContext): string {
  const parts = [
    `${context.name}${context.age ? ` (${context.age} years)` : ""} presents with "${context.currentIssue ?? "reported issue"}".`,
  ]
  if (context.previousOutcomes?.length) {
    const last = context.previousOutcomes[context.previousOutcomes.length - 1]
    parts.push(`Latest outcome for "${last.metric}": ${last.currentValue ?? "recorded"} (${last.response.toLowerCase()}).`)
  }
  if (context.currentTreatments?.length) {
    parts.push(`Current treatment: ${context.currentTreatments.map((t) => t.name).join(", ")}.`)
  }
  parts.push("Monitor response and adjust plan as needed.")
  return parts.join(" ")
}