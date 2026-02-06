"use client"

import React from "react"

import { useState, useRef, useEffect } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { DisclaimerBanner } from "@/components/disclaimer-banner"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { detectCrisis } from "@/lib/crisis-detection"
import { ArrowUp, Compass, Loader2 } from "lucide-react"

function CrisisAlert() {
  return (
    <div className="mx-auto max-w-lg rounded-lg border border-destructive/30 bg-destructive/5 p-4">
      <p className="text-sm font-medium text-destructive">
        It sounds like you might be going through something serious.
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        If you are in crisis, please reach out to the{" "}
        <a
          href="https://988lifeline.org"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium underline text-foreground"
        >
          988 Suicide & Crisis Lifeline
        </a>{" "}
        (call or text 988). This tool is for leadership coaching, not crisis
        support.
      </p>
    </div>
  )
}

export default function OnboardingPage() {
  const [input, setInput] = useState("")
  const [crisisDetected, setCrisisDetected] = useState(false)
  const [principleConfirmed, setPrincipleConfirmed] = useState(false)
  const [saving, setSaving] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/onboarding" }),
  })

  const isLoading = status === "streaming" || status === "submitted"

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Check for principle confirmation in AI responses
  useEffect(() => {
    const lastMsg = messages[messages.length - 1]
    if (lastMsg?.role === "assistant") {
      const text =
        lastMsg.parts
          ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
          .map((p) => p.text)
          .join("") || ""

      if (text.includes("PRINCIPLE_CONFIRMED:")) {
        const principle = text
          .split("PRINCIPLE_CONFIRMED:")[1]
          ?.trim()
          .replace(/[\n\r].*/s, "")
          .trim()
        if (principle) {
          savePrinciple(principle, messages)
        }
      }
    }
  }, [messages])

  async function savePrinciple(
    principleText: string,
    msgs: typeof messages
  ) {
    setPrincipleConfirmed(true)
    setSaving(true)

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push("/auth/login")
      return
    }

    // Extract source regret and better version from conversation
    const userMessages = msgs
      .filter((m) => m.role === "user")
      .map(
        (m) =>
          m.parts
            ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
            .map((p) => p.text)
            .join("") || ""
      )
    const sourceRegret = userMessages[0] || ""
    const betterVersion = userMessages[1] || ""

    await supabase.from("principles").insert({
      user_id: user.id,
      principle_text: principleText,
      source_regret: sourceRegret,
      better_version: betterVersion,
    })

    // Mark onboarding as complete
    await supabase
      .from("profiles")
      .update({ onboarding_complete: true })
      .eq("id", user.id)

    setSaving(false)

    // Wait a moment, then redirect to dashboard
    setTimeout(() => router.push("/dashboard"), 2000)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading || principleConfirmed) return

    if (detectCrisis(input)) {
      setCrisisDetected(true)
      return
    }

    sendMessage({ text: input })
    setInput("")
  }

  const hasStarted = messages.length > 0

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <DisclaimerBanner />

      {/* Header */}
      <header className="flex items-center gap-2 border-b px-6 py-3">
        <Compass className="h-5 w-5 text-primary" />
        <span className="text-sm font-semibold text-foreground">
          Ledger
        </span>
        <span className="text-sm text-muted-foreground">
          / Onboarding
        </span>
      </header>

      {/* Chat area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-8">
        <div className="mx-auto max-w-lg flex flex-col gap-6">
          {/* Initial prompt if no messages */}
          {!hasStarted && !crisisDetected && (
            <div className="flex flex-col gap-4 py-12 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Compass className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground text-balance">
                {"Let's build your first leadership principle"}
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Think of a recent moment you handled poorly — something{" "}
                {"you're"} still annoyed at yourself about. Describe it in one
                sentence.
              </p>
            </div>
          )}

          {crisisDetected && <CrisisAlert />}

          {/* Messages */}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-card-foreground border"
                }`}
              >
                {message.parts
                  ?.filter((p) => p.type === "text")
                  .map((part, i) => {
                    if (part.type === "text") {
                      // Hide the PRINCIPLE_CONFIRMED marker from display
                      const displayText = part.text
                        .replace(/PRINCIPLE_CONFIRMED:.*$/m, "")
                        .trim()
                      return displayText ? (
                        <span key={i} className="whitespace-pre-wrap">
                          {displayText}
                        </span>
                      ) : null
                    }
                    return null
                  })}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl border bg-card px-4 py-3 text-sm text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Thinking...
              </div>
            </div>
          )}

          {principleConfirmed && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-center">
              <p className="text-sm font-medium text-primary">
                {saving
                  ? "Saving your principle..."
                  : "Principle saved! Redirecting to your dashboard..."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Input area */}
      {!principleConfirmed && (
        <div className="border-t bg-background px-4 py-4">
          <form
            onSubmit={handleSubmit}
            className="mx-auto flex max-w-lg items-end gap-2"
          >
            <Textarea
              value={input}
              onChange={(e) => {
                setInput(e.target.value)
                setCrisisDetected(false)
              }}
              placeholder={
                hasStarted
                  ? "Type your response..."
                  : "Describe a moment you handled poorly..."
              }
              className="min-h-[48px] max-h-32 resize-none rounded-xl"
              rows={1}
              disabled={isLoading}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit(e)
                }
              }}
            />
            <Button
              type="submit"
              size="icon"
              className="h-10 w-10 shrink-0 rounded-xl"
              disabled={!input.trim() || isLoading}
            >
              <ArrowUp className="h-4 w-4" />
              <span className="sr-only">Send message</span>
            </Button>
          </form>
        </div>
      )}
    </div>
  )
}
