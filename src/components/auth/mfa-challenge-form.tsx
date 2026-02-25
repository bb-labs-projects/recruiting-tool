'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

type ChallengeMode = 'totp' | 'recovery'

export function MfaChallengeForm() {
  const router = useRouter()
  const [mode, setMode] = useState<ChallengeMode>('totp')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const endpoint = mode === 'totp'
      ? '/api/auth/mfa/verify'
      : '/api/auth/mfa/recovery'

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        router.push(data.redirectTo ?? '/')
      } else {
        setError(data.error ?? 'Verification failed. Please try again.')
      }
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-sm rounded-xl border-0 card-warm">
      <CardHeader className="text-center">
        <CardTitle className="font-[family-name:var(--font-outfit)] text-xl tracking-tight">
          {mode === 'totp' ? 'Two-Factor Authentication' : 'Recovery Code'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mfa-code">
              {mode === 'totp'
                ? 'Enter the 6-digit code from your authenticator app'
                : 'Enter one of your recovery codes'}
            </Label>
            <Input
              id="mfa-code"
              type="text"
              inputMode={mode === 'totp' ? 'numeric' : 'text'}
              autoComplete="one-time-code"
              placeholder={mode === 'totp' ? '000000' : 'ABCD1234'}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              maxLength={mode === 'totp' ? 6 : 8}
              className="text-center text-lg tracking-widest"
              autoFocus
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button
            type="submit"
            className="w-full rounded-lg"
            disabled={loading || !code.trim()}
          >
            {loading ? 'Verifying...' : 'Verify'}
          </Button>
        </form>

        <div className="mt-4 text-center">
          {mode === 'totp' ? (
            <button
              type="button"
              className="text-sm text-muted-foreground underline hover:text-foreground"
              onClick={() => { setMode('recovery'); setCode(''); setError('') }}
            >
              Use a recovery code instead
            </button>
          ) : (
            <button
              type="button"
              className="text-sm text-muted-foreground underline hover:text-foreground"
              onClick={() => { setMode('totp'); setCode(''); setError('') }}
            >
              Use authenticator app instead
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
