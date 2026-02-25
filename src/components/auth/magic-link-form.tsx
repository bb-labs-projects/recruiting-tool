'use client'

import { useState } from 'react'
import { useActionState } from 'react'
import { requestMagicLink, type MagicLinkState } from '@/actions/auth'
import { TurnstileWidget } from '@/components/turnstile-widget'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { User, Briefcase } from 'lucide-react'

/**
 * Magic link login form with role selection.
 *
 * New users choose whether they're a candidate or employer.
 * Returning users' existing role is preserved regardless of selection.
 */
export function MagicLinkForm() {
  const [role, setRole] = useState<'candidate' | 'employer'>('candidate')
  const [turnstileToken, setTurnstileToken] = useState('')
  const [state, action, pending] = useActionState<MagicLinkState, FormData>(
    requestMagicLink,
    undefined
  )

  if (state?.success) {
    return (
      <Card className="w-full max-w-sm rounded-xl border-0 card-warm">
        <CardHeader className="text-center">
          <CardTitle className="font-[family-name:var(--font-outfit)] text-xl tracking-tight">Check your email</CardTitle>
          <CardDescription>
            We sent a login link to your email address. Click the link in the
            email to sign in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>The link expires in 10 minutes.</p>
            <p>
              Didn&apos;t receive it? Check your spam folder or request a new
              link.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-sm rounded-xl border-0 card-warm">
      <CardHeader className="text-center">
        <CardTitle className="font-[family-name:var(--font-outfit)] text-xl tracking-tight">Sign In</CardTitle>
        <CardDescription>
          Enter your email to receive a login link
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <div className="space-y-2">
            <Label>I am a</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('candidate')}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all',
                  role === 'candidate'
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-input bg-background hover:bg-muted'
                )}
              >
                <User className="size-4" />
                Candidate
              </button>
              <button
                type="button"
                onClick={() => setRole('employer')}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all',
                  role === 'employer'
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-input bg-background hover:bg-muted'
                )}
              >
                <Briefcase className="size-4" />
                Employer
              </button>
            </div>
            <input type="hidden" name="role" value={role} />
            <input type="hidden" name="turnstileToken" value={turnstileToken} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              autoFocus
              autoComplete="email"
              aria-describedby={state?.error ? 'email-error' : undefined}
            />
            {state?.error && (
              <p id="email-error" className="text-sm text-destructive">
                {state.error}
              </p>
            )}
          </div>
          <TurnstileWidget onSuccess={setTurnstileToken} />
          <Button type="submit" className="w-full rounded-lg" disabled={pending}>
            {pending ? 'Sending...' : 'Send Login Link'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
