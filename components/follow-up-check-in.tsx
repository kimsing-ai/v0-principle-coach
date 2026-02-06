"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"
import { Check, X, Minus } from "lucide-react"

interface FollowUpCheckInProps {
  sessionId: string
  commitment: string
  onComplete: () => void
}

export function FollowUpCheckIn({
  sessionId,
  commitment,
  onComplete,
}: FollowUpCheckInProps) {
  const [response, setResponse] = useState<string | null>(null)
  const [note, setNote] = useState("")
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    setSaving(true)
    const supabase = createClient()
    await supabase
      .from("coaching_sessions")
      .update({
        follow_up_status: response,
        follow_up_note: note || null,
        followed_up_at: new Date().toISOString(),
      })
      .eq("id", sessionId)

    setSaving(false)
    onComplete()
  }

  return (
    <div className="rounded-xl border bg-card p-5 flex flex-col gap-4">
      <div>
        <p className="text-sm font-semibold text-card-foreground">
          How did it go?
        </p>
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
          You committed to: {commitment}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant={response === "yes" ? "default" : "outline"}
          size="sm"
          onClick={() => setResponse("yes")}
          className="gap-1.5"
        >
          <Check className="h-3.5 w-3.5" />
          Yes
        </Button>
        <Button
          variant={response === "partly" ? "default" : "outline"}
          size="sm"
          onClick={() => setResponse("partly")}
          className="gap-1.5"
        >
          <Minus className="h-3.5 w-3.5" />
          Partly
        </Button>
        <Button
          variant={response === "no" ? "default" : "outline"}
          size="sm"
          onClick={() => setResponse("no")}
          className="gap-1.5"
        >
          <X className="h-3.5 w-3.5" />
          No
        </Button>
      </div>

      {response && (
        <>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              response === "no"
                ? "No worries. What got in the way? (optional)"
                : "What happened? (optional)"
            }
            className="min-h-[60px] resize-none rounded-xl text-sm"
            rows={2}
          />
          <Button
            onClick={handleSubmit}
            disabled={saving}
            size="sm"
            className="self-end"
          >
            {saving ? "Saving..." : "Submit"}
          </Button>
        </>
      )}
    </div>
  )
}
