import {
  consumeStream,
  convertToModelMessages,
  streamText,
  type UIMessage,
} from "ai"
import { buildCoachingSystemPrompt, FRAMEWORKS } from "@/lib/coaching-prompts"

export const maxDuration = 30

export async function POST(req: Request) {
  const {
    messages,
    principle,
    situation,
    wedge,
    frameworkId,
  }: {
    messages: UIMessage[]
    principle: string
    situation: string
    wedge: string
    frameworkId?: string
  } = await req.json()

  const framework = frameworkId
    ? FRAMEWORKS.find((f) => f.id === frameworkId) || FRAMEWORKS[0]
    : FRAMEWORKS[Math.floor(Math.random() * FRAMEWORKS.length)]

  const systemPrompt = buildCoachingSystemPrompt(
    principle,
    situation,
    wedge,
    framework
  )

  const result = streamText({
    model: "openai/gpt-4o-mini",
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    abortSignal: req.signal,
  })

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    consumeSseStream: consumeStream,
  })
}
