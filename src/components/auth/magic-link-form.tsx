'use client'

import { useActionState } from 'react'
import { requestMagicLink, type MagicLinkState } from '@/actions/auth'
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

/**
 * Magic link login form.
 *
 * Uses React 19 useActionState to wire the form to the requestMagicLink
 * server action. Shows a success message after submission, or validation
 * and rate-limit errors inline.
 */
export function MagicLinkForm() {
  const [state, action, pending] = useActionState<MagicLinkState, FormData>(
    requestMagicLink,
    undefined
  )

  if (state?.success) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Check your email</CardTitle>
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
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Sign In</CardTitle>
        <CardDescription>
          Enter your email to receive a login link
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
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
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? 'Sending...' : 'Send Login Link'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
