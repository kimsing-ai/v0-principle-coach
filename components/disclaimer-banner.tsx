import { ShieldAlert } from "lucide-react"

export function DisclaimerBanner() {
  return (
    <div className="flex items-center gap-2 bg-muted px-4 py-2 text-xs text-muted-foreground">
      <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
      <p>
        This is a leadership coaching tool, not therapy. If you are in crisis,
        please contact the{" "}
        <a
          href="https://988lifeline.org"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 font-medium text-foreground"
        >
          988 Suicide & Crisis Lifeline
        </a>
        .
      </p>
    </div>
  )
}
