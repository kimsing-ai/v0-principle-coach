"use client"

import { Button } from "@/components/ui/button"
import { DisclaimerBanner } from "@/components/disclaimer-banner"
import { ArrowRight, Compass, Zap, MessageCircle } from "lucide-react"
import Link from "next/link"

export default function LandingPage() {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <DisclaimerBanner />

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <Compass className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold text-foreground">Ledger</span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/auth/login">Sign in</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/auth/sign-up">Get started</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mx-auto max-w-2xl">
          <p className="mb-4 text-sm font-medium uppercase tracking-wider text-primary">
            AI Leadership Coach
          </p>
          <h1 className="text-balance text-4xl font-bold leading-tight text-foreground md:text-5xl lg:text-6xl">
            Turn your worst moments into leadership principles
          </h1>
          <p className="mx-auto mt-6 max-w-lg text-pretty text-lg leading-relaxed text-muted-foreground">
            Share a regret. Get a principle. Receive coaching. Commit to action.
            90 seconds to become a better leader.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button size="lg" className="gap-2 px-8" asChild>
              <Link href="/auth/sign-up">
                Start coaching
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="mx-auto mt-20 grid max-w-3xl gap-8 md:grid-cols-3">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <MessageCircle className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">Share a Regret</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Think of a moment you handled poorly. Your coach extracts a
              leadership principle from it.
            </p>
          </div>
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">Get Coached</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              AI coaching through 7 rotating frameworks. Direct, warm, and
              tailored to your situation.
            </p>
          </div>
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Compass className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">Build Your Ledger</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Principles accumulate. Each session builds on the last. Your
              leadership ledger grows with you.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-6 text-center text-xs text-muted-foreground">
        <p>
          Ledger is a leadership coaching tool. It is not therapy and does not
          replace professional mental health services.
        </p>
      </footer>
    </div>
  )
}
