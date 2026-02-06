"use client"

import React from "react"

import { useState, useRef, useEffect, useCallback } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { DisclaimerBanner } from "@/components/disclaimer-banner"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { detectCrisis } from "@/lib/crisis-detection"
import { WEDGE_LABELS, getRandomFramework, type WedgeLabel } from "@/lib/coaching-prompts"
import {
  ArrowUp,
  Compass,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  Check,
  ArrowLeft,
} from "lucide-react"
import Link from "next/link"
import useSWR from "swr"

type SessionPhase =
  | "select-principle"
  | "describe-situation"
  | "select-wedge"
  | "coaching"
  | "commitment"
  | "feedback"
  | "done"

interface Principle {
  id: string
  principle_text: string
}

const fetcher = async (url: string) => {
  const supabase = createClient()
  const { data } = await supabase
    .from("principles")
    .select("id, principle_text")
    .order("created_at", { ascending: false })
  return data || []
}

export default function SessionPage() {
  const [phase, setPhase] = useState<SessionPhase>("select-principle")
  const [selectedPrinciple, setSelectedPrinciple] = useState<Principle | null>(null)
  const [situation, setSituation] = useState("")
  const [wedge, setWedge] = useState<WedgeLabel | null>(null)
  const [input, setInput] = useState("")
  const [crisisDetected, setCrisisDetected] = useState(false)
  const [commitmentOptions, setCommitmentOptions] = useState<string[]>([])
  const [selectedCommitment, setSelectedCommitment] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [framework] = useState(() => getRandomFramework())
  const scrollRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const { data: principles = [] } = useSWR<Principle[]>("principles", fetcher)

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/coaching",
      prepareSendMessagesRequest: ({ id, messages }) => ({
        body: {
          messages,
          id,
          principle: selectedPrinciple?.principle_text || "",
          situation,
          wedge: wedge || "",
          frameworkId: framework.id,
        },
      }),
    }),
  })

  const isLoading = status === "streaming" || status === "submitted"

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, phase])

  // Parse commitment options from AI response
  useEffect(() => {
    if (phase !== "coaching") return
    const lastMsg = messages[messages.length - 1]
    if (lastMsg?.role !== "assistant") return

    const text =
      lastMsg.parts
        ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join("") || ""

    if (text.includes("COMMITMENT_OPTIONS:") && status === "ready") {
      const optionsBlock = text.split("COMMITMENT_OPTIONS:")[1]?.trim()
      if (optionsBlock) {
        const options = optionsBlock
          .split("\n")
          .map((line) => line.replace(/^\d+\.\s*/, "").trim())
          .filter((line) => line.length > 0)
          .slice(0, 3)

        if (options.length > 0) {
          setCommitmentOptions(options)
          setPhase("commitment")
        }
      }
    }
  }, [messages, status, phase])

  const saveSession = useCallback(
    async (commitment: string, feedbackValue: number) => {
      setSaving(true)
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const coachingText =
        messages
          .filter((m) => m.role === "assistant")
          .map(
            (m) =>
              m.parts
                ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
                .map((p) => p.text)
                .join("") || ""
          )
          .join("\n\n") || ""

      await supabase.from("coaching_sessions").insert({
        user_id: user.id,
        principle_id: selectedPrinciple?.id || null,
        situation,
        wedge_label: wedge || "",
        framework_used: framework.id,
        coaching_script: coachingText,
        commitment,
        feedback: feedbackValue,
        follow_up_status: "pending",
      })

      setSaving(false)
      setPhase("done")
    },
    [messages, selectedPrinciple, situation, wedge, framework]
  )

  const handleSituationSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!situation.trim()) return

    if (detectCrisis(situation)) {
      setCrisisDetected(true)
      return
    }

    setPhase("select-wedge")
  }

  const handleWedgeSelect = (selectedWedge: WedgeLabel) => {
    setWedge(selectedWedge)
    setPhase("coaching")

    // Start the coaching conversation
    sendMessage({
      text: `I'm dealing with a ${selectedWedge.toLowerCase()} situation. Here's what happened: ${situation}`,
    })
  }

  const handleCommitmentSelect = (commitment: string) => {
    setSelectedCommitment(commitment)
    setPhase("feedback")
  }

  const handleFeedback = (value: number) => {
    setFeedback(value)
    saveSession(selectedCommitment || "", value)
  }

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    if (detectCrisis(input)) {
      setCrisisDetected(true)
      return
    }

    sendMessage({ text: input })
    setInput("")
  }

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <DisclaimerBanner />

      {/* Header */}
      <header className="flex items-center gap-2 border-b px-6 py-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <Compass className="h-5 w-5 text-primary" />
        <span className="text-sm font-semibold text-foreground">Ledger</span>
        <span className="text-sm text-muted-foreground">/ Session</span>
        {framework && (
          <Badge variant="secondary" className="ml-auto text-xs">
            {framework.label}
          </Badge>
        )}
      </header>

      {/* Content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-8">
        <div className="mx-auto max-w-lg flex flex-col gap-6">
          {/* PHASE: Select Principle */}
          {phase === "select-principle" && (
            <div className="flex flex-col gap-6">
              <div className="text-center">
                <h2 className="text-xl font-bold text-foreground">
                  Which principle do you want to work on?
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Choose one of your principles for this coaching session.
                </p>
              </div>
              {principles.length === 0 ? (
                <div className="rounded-lg border bg-card p-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    No principles yet.{" "}
                    <Link
                      href="/onboarding"
                      className="text-primary underline underline-offset-2"
                    >
                      Create your first one
                    </Link>
                    .
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {principles.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedPrinciple(p)
                        setPhase("describe-situation")
                      }}
                      className="rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary hover:bg-primary/5"
                    >
                      <p className="text-sm font-medium text-card-foreground">
                        {p.principle_text}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* PHASE: Describe Situation */}
          {phase === "describe-situation" && selectedPrinciple && (
            <div className="flex flex-col gap-6">
              <div className="text-center">
                <Badge variant="outline" className="mb-3">
                  {selectedPrinciple.principle_text}
                </Badge>
                <h2 className="text-xl font-bold text-foreground">
                  {"What's happening?"}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Describe the situation in one sentence. Where is this
                  principle being tested?
                </p>
              </div>

              {crisisDetected && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                  <p className="text-sm text-muted-foreground">
                    If {"you're"} in crisis, please reach out to the{" "}
                    <a
                      href="https://988lifeline.org"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium underline text-foreground"
                    >
                      988 Lifeline
                    </a>
                    .
                  </p>
                </div>
              )}

              <form
                onSubmit={handleSituationSubmit}
                className="flex flex-col gap-3"
              >
                <Textarea
                  value={situation}
                  onChange={(e) => {
                    setSituation(e.target.value)
                    setCrisisDetected(false)
                  }}
                  placeholder="e.g. My boss asked me to take on another project and I said yes even though my team is buried..."
                  className="min-h-[80px] resize-none rounded-xl"
                  rows={3}
                />
                <Button
                  type="submit"
                  disabled={!situation.trim()}
                  className="w-full"
                >
                  Continue
                </Button>
              </form>
            </div>
          )}

          {/* PHASE: Select Wedge */}
          {phase === "select-wedge" && (
            <div className="flex flex-col gap-6">
              <div className="text-center">
                <h2 className="text-xl font-bold text-foreground">
                  What kind of moment is this?
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  This helps your coach tailor their approach.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {WEDGE_LABELS.map((label) => (
                  <button
                    key={label}
                    onClick={() => handleWedgeSelect(label)}
                    className="rounded-xl border bg-card p-4 text-center text-sm font-medium text-card-foreground transition-colors hover:border-primary hover:bg-primary/5"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* PHASE: Coaching Chat */}
          {(phase === "coaching" ||
            phase === "commitment" ||
            phase === "feedback" ||
            phase === "done") && (
            <>
              {/* Show context */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {selectedPrinciple?.principle_text}
                </Badge>
                {wedge && (
                  <Badge variant="secondary" className="text-xs">
                    {wedge}
                  </Badge>
                )}
              </div>

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
                          const displayText = part.text
                            .replace(/COMMITMENT_OPTIONS:[\s\S]*/m, "")
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
                    Coaching...
                  </div>
                </div>
              )}
            </>
          )}

          {/* PHASE: Commitment */}
          {phase === "commitment" && commitmentOptions.length > 0 && (
            <div className="flex flex-col gap-4 rounded-lg border border-primary/30 bg-primary/5 p-4">
              <p className="text-sm font-semibold text-foreground">
                What will you commit to?
              </p>
              {commitmentOptions.map((option, i) => (
                <button
                  key={i}
                  onClick={() => handleCommitmentSelect(option)}
                  className="rounded-xl border bg-card p-3 text-left text-sm text-card-foreground transition-colors hover:border-primary hover:bg-primary/5"
                >
                  {option}
                </button>
              ))}
            </div>
          )}

          {/* PHASE: Feedback */}
          {phase === "feedback" && (
            <div className="flex flex-col items-center gap-4 rounded-lg border bg-card p-6">
              <p className="text-sm font-semibold text-card-foreground">
                Was this coaching helpful?
              </p>
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => handleFeedback(1)}
                  className="gap-2"
                  disabled={saving}
                >
                  <ThumbsUp className="h-4 w-4" />
                  Yes
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => handleFeedback(0)}
                  className="gap-2"
                  disabled={saving}
                >
                  <ThumbsDown className="h-4 w-4" />
                  Not really
                </Button>
              </div>
              {saving && (
                <p className="text-xs text-muted-foreground">Saving...</p>
              )}
            </div>
          )}

          {/* PHASE: Done */}
          {phase === "done" && (
            <div className="flex flex-col items-center gap-4 rounded-lg border border-primary/30 bg-primary/5 p-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="h-6 w-6" />
              </div>
              <p className="font-semibold text-foreground">
                {"Got it. I'll check in next time. Go nail it."}
              </p>
              {selectedCommitment && (
                <p className="text-sm text-muted-foreground">
                  Your commitment: {selectedCommitment}
                </p>
              )}
              <Button asChild className="mt-2">
                <Link href="/dashboard">Back to dashboard</Link>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Input for coaching phase only */}
      {phase === "coaching" && !isLoading && commitmentOptions.length === 0 && (
        <div className="border-t bg-background px-4 py-4">
          <form
            onSubmit={handleChatSubmit}
            className="mx-auto flex max-w-lg items-end gap-2"
          >
            <Textarea
              value={input}
              onChange={(e) => {
                setInput(e.target.value)
                setCrisisDetected(false)
              }}
              placeholder="Ask a follow-up or share more context..."
              className="min-h-[48px] max-h-32 resize-none rounded-xl"
              rows={1}
              disabled={isLoading}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleChatSubmit(e)
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
              <span className="sr-only">Send</span>
            </Button>
          </form>
        </div>
      )}
    </div>
  )
}
