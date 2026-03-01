'use client'

import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

type VerifyStatus = 'idle' | 'loading' | 'success' | 'error'

/**
 * Two-step magic link verification component.
 *
 * Reads the token from URL search params but does NOT auto-consume it.
 * The user must click "Confirm Login" to trigger the POST request.
 * This prevents email client prefetch bots from consuming the token.
 */
export function MagicLinkVerify() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')

  const [status, setStatus] = useState<VerifyStatus>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  if (!token) {
    return (
      <Card className="w-full max-w-sm rounded-xl border-0 card-warm">
        <CardHeader className="text-center">
          <CardTitle className="font-sans text-xl tracking-tight">Invalid Link</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No token found. This link may be incomplete or malformed.
          </p>
          <Button
            variant="outline"
            className="mt-4 w-full rounded-lg"
            onClick={() => router.push('/login')}
          >
            Request New Link
          </Button>
        </CardContent>
      </Card>
    )
  }

  async function handleConfirm() {
    setStatus('loading')
    setErrorMessage('')

    try {
      const response = await fetch('/api/auth/magic-link/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setStatus('success')
        // Brief delay so user sees the success message before redirect
        setTimeout(() => {
          router.push(data.redirectTo ?? '/')
        }, 500)
      } else if (response.status === 401) {
        setStatus('error')
        setErrorMessage(data.error ?? 'Invalid or expired token.')
      } else {
        setStatus('error')
        setErrorMessage(data.error ?? 'Something went wrong. Please try again.')
      }
    } catch {
      setStatus('error')
      setErrorMessage('Network error. Please check your connection and try again.')
    }
  }

  if (status === 'success') {
    return (
      <Card className="w-full max-w-sm rounded-xl border-0 card-warm">
        <CardHeader className="text-center">
          <CardTitle className="font-sans text-xl tracking-tight">Success!</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            You&apos;re signed in. Redirecting...
          </p>
        </CardContent>
      </Card>
    )
  }

  if (status === 'error') {
    return (
      <Card className="w-full max-w-sm rounded-xl border-0 card-warm">
        <CardHeader className="text-center">
          <CardTitle className="font-sans text-xl tracking-tight">Sign In Failed</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{errorMessage}</p>
          <Button
            variant="outline"
            className="mt-4 w-full rounded-lg"
            onClick={() => router.push('/login')}
          >
            Request New Link
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-sm rounded-xl border-0 card-warm">
      <CardHeader className="text-center">
        <CardTitle className="font-sans text-xl tracking-tight">Confirm Sign In</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-muted-foreground">
          Click the button below to complete your sign in.
        </p>
        <Button
          className="w-full rounded-lg"
          onClick={handleConfirm}
          disabled={status === 'loading'}
        >
          {status === 'loading' ? 'Verifying...' : 'Confirm Login'}
        </Button>
      </CardContent>
    </Card>
  )
}
