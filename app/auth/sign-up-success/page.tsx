import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Mail } from "lucide-react"
import { DisclaimerBanner } from "@/components/disclaimer-banner"

export default function SignUpSuccessPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <DisclaimerBanner />
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-2xl font-bold">
                Check your email
              </CardTitle>
              <CardDescription>
                We sent you a confirmation link. Click it to activate your
                account and start coaching.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center text-sm text-muted-foreground">
                {"Didn't receive it? Check your spam folder."}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
