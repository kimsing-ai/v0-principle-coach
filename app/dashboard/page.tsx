"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DisclaimerBanner } from "@/components/disclaimer-banner"
import { FollowUpCheckIn } from "@/components/follow-up-check-in"
import {
  Compass,
  Plus,
  LogOut,
  BookOpen,
  Zap,
  MessageCircle,
} from "lucide-react"
import Link from "next/link"
import useSWR from "swr"

interface Profile {
  display_name: string | null
  onboarding_complete: boolean
}

interface Principle {
  id: string
  principle_text: string
  source_regret: string | null
  created_at: string
}

interface CoachingSession {
  id: string
  principle_id: string | null
  situation: string
  wedge_label: string
  framework_used: string
  commitment: string | null
  feedback: number | null
  follow_up_status: string | null
  created_at: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/auth/login")
        return
      }
      setUserId(user.id)
    })
  }, [router])

  const { data: profile } = useSWR<Profile>(
    userId ? `profile-${userId}` : null,
    async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from("profiles")
        .select("display_name, onboarding_complete")
        .eq("id", userId!)
        .single()
      return data
    }
  )

  const { data: principles = [], mutate: mutatePrinciples } = useSWR<Principle[]>(
    userId ? `principles-${userId}` : null,
    async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from("principles")
        .select("id, principle_text, source_regret, created_at")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
      return data || []
    }
  )

  const { data: sessions = [], mutate: mutateSessions } = useSWR<CoachingSession[]>(
    userId ? `sessions-${userId}` : null,
    async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from("coaching_sessions")
        .select(
          "id, principle_id, situation, wedge_label, framework_used, commitment, feedback, follow_up_status, created_at"
        )
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
      return data || []
    }
  )

  const pendingFollowUps = sessions.filter(
    (s) => s.follow_up_status === "pending" && s.commitment
  )

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
  }

  const handleFollowUpComplete = useCallback(() => {
    mutateSessions()
  }, [mutateSessions])

  // Redirect to onboarding if not complete and no principles
  useEffect(() => {
    if (profile && !profile.onboarding_complete && principles.length === 0) {
      router.push("/onboarding")
    }
  }, [profile, principles, router])

  if (!userId) return null

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <DisclaimerBanner />

      {/* Header */}
      <header className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-2">
          <Compass className="h-5 w-5 text-primary" />
          <span className="text-sm font-semibold text-foreground">
            Ledger
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {profile?.display_name || ""}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSignOut}
            className="h-8 w-8"
          >
            <LogOut className="h-4 w-4" />
            <span className="sr-only">Sign out</span>
          </Button>
        </div>
      </header>

      <main className="flex-1 px-4 py-8">
        <div className="mx-auto max-w-2xl flex flex-col gap-8">
          {/* Greeting */}
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {profile?.display_name
                ? `Hey, ${profile.display_name}`
                : "Your Dashboard"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {sessions.length === 0
                ? "Start your first coaching session to build momentum."
                : `${sessions.length} session${sessions.length !== 1 ? "s" : ""} completed`}
            </p>
          </div>

          {/* Follow-up check-ins */}
          {pendingFollowUps.length > 0 && (
            <section className="flex flex-col gap-4">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <MessageCircle className="h-4 w-4 text-accent" />
                Follow-up Check-ins
              </h2>
              {pendingFollowUps.slice(0, 2).map((session) => (
                <FollowUpCheckIn
                  key={session.id}
                  sessionId={session.id}
                  commitment={session.commitment || ""}
                  onComplete={handleFollowUpComplete}
                />
              ))}
            </section>
          )}

          {/* Start new session */}
          <Button
            size="lg"
            className="gap-2 w-full"
            asChild
          >
            <Link href="/session">
              <Zap className="h-4 w-4" />
              New coaching session
            </Link>
          </Button>

          {/* Principles */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <BookOpen className="h-4 w-4 text-primary" />
                Your Principles ({principles.length})
              </h2>
              <Button variant="ghost" size="sm" className="gap-1 text-xs" asChild>
                <Link href="/onboarding">
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </Link>
              </Button>
            </div>

            {principles.length === 0 ? (
              <div className="rounded-xl border bg-card p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No principles yet. Complete onboarding to extract your first
                  leadership principle.
                </p>
                <Button size="sm" className="mt-4" asChild>
                  <Link href="/onboarding">Start onboarding</Link>
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {principles.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-xl border bg-card p-4"
                  >
                    <p className="text-sm font-medium text-card-foreground">
                      {p.principle_text}
                    </p>
                    {p.source_regret && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        From: {p.source_regret}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Recent Sessions */}
          {sessions.length > 0 && (
            <section className="flex flex-col gap-4">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Zap className="h-4 w-4 text-primary" />
                Recent Sessions
              </h2>
              <div className="flex flex-col gap-3">
                {sessions.slice(0, 5).map((session) => (
                  <div
                    key={session.id}
                    className="rounded-xl border bg-card p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-card-foreground line-clamp-2">
                        {session.situation}
                      </p>
                      <Badge variant="secondary" className="shrink-0 text-xs">
                        {session.wedge_label}
                      </Badge>
                    </div>
                    {session.commitment && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Committed to: {session.commitment}
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {session.framework_used}
                      </Badge>
                      {session.follow_up_status &&
                        session.follow_up_status !== "pending" && (
                          <Badge
                            variant={
                              session.follow_up_status === "yes"
                                ? "default"
                                : "secondary"
                            }
                            className="text-xs"
                          >
                            Follow-up: {session.follow_up_status}
                          </Badge>
                        )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 text-center text-xs text-muted-foreground">
        <p>
          This is a leadership coaching tool, not therapy. Not a substitute for
          professional mental health services.
        </p>
      </footer>
    </div>
  )
}
