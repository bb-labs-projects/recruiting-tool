'use client'

import { useState } from 'react'
import { useActionState } from 'react'
import { requestMagicLink, type MagicLinkState } from '@/actions/auth'
import { TurnstileWidget } from '@/components/turnstile-widget'
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
      <div className="w-full space-y-4">
        <div className="space-y-2">
          <h1 className="font-sans text-2xl font-semibold text-foreground">
            Check your email
          </h1>
          <p className="text-sm text-muted-foreground">
            We sent a login link to your email address. Click the link in the
            email to sign in.
          </p>
        </div>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>The link expires in 10 minutes.</p>
          <p>
            Didn&apos;t receive it? Check your spam folder or request a new
            link.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      <div className="space-y-2">
        <h1 className="font-sans text-2xl font-semibold text-foreground">
          Sign in
        </h1>
        <p className="text-sm text-muted-foreground">
          Enter your email to continue
        </p>
      </div>

      <form action={action} className="space-y-5">
        {/* Role selector - inline toggle tabs */}
        <div className="space-y-3">
          <div className="flex gap-6">
            <button
              type="button"
              onClick={() => setRole('candidate')}
              className={cn(
                'flex flex-col items-center gap-1.5 pb-2 text-sm font-medium transition-colors duration-150',
                role === 'candidate'
                  ? 'border-b-2 border-brand text-foreground'
                  : 'border-b-2 border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <User className="size-4" />
              Candidate
            </button>
            <button
              type="button"
              onClick={() => setRole('employer')}
              className={cn(
                'flex flex-col items-center gap-1.5 pb-2 text-sm font-medium transition-colors duration-150',
                role === 'employer'
                  ? 'border-b-2 border-brand text-foreground'
                  : 'border-b-2 border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <Briefcase className="size-4" />
              Employer
            </button>
          </div>
          <input type="hidden" name="role" value={role} />
          <input type="hidden" name="turnstileToken" value={turnstileToken} />
        </div>

        {/* Email input */}
        <div className="space-y-2">
          <input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            required
            autoFocus
            autoComplete="email"
            aria-describedby={state?.error ? 'email-error' : undefined}
            className="h-11 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground transition-colors duration-150 focus:border-foreground/40"
          />
          {state?.error && (
            <p id="email-error" className="text-sm text-destructive">
              {state.error}
            </p>
          )}
        </div>

        {/* Turnstile */}
        <TurnstileWidget onSuccess={setTurnstileToken} />

        {/* Submit button */}
        <button
          type="submit"
          disabled={pending}
          className="h-11 w-full rounded-md bg-brand text-sm font-medium text-brand-foreground transition-opacity duration-150 hover:opacity-90 disabled:pointer-events-none disabled:opacity-50"
        >
          {pending ? 'Sending...' : 'Send Login Link'}
        </button>

        <p className="text-xs text-muted-foreground">
          We will email you a magic link
        </p>
      </form>
    </div>
  )
}
