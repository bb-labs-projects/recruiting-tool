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
  CardDescription,
} from '@/components/ui/card'
import { disableMfa } from '@/actions/mfa'

type SetupStep = 'idle' | 'scanning' | 'recovery' | 'done'

interface MfaSetupFormProps {
  mfaEnabled: boolean
}

export function MfaSetupForm({ mfaEnabled }: MfaSetupFormProps) {
  const router = useRouter()
  const [step, setStep] = useState<SetupStep>('idle')
  const [secret, setSecret] = useState('')
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('')
  const [verifyCode, setVerifyCode] = useState('')
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Disable MFA state
  const [disableCode, setDisableCode] = useState('')
  const [disableError, setDisableError] = useState('')
  const [disableLoading, setDisableLoading] = useState(false)
  const [showDisable, setShowDisable] = useState(false)

  async function handleStartSetup() {
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/mfa/setup', {
        method: 'POST',
      })
      const data = await response.json()

      if (response.ok) {
        setSecret(data.secret)
        setQrCodeDataUrl(data.qrCodeDataUrl)
        setStep('scanning')
      } else {
        setError(data.error ?? 'Failed to start MFA setup')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/mfa/confirm-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret, code: verifyCode.trim() }),
      })
      const data = await response.json()

      if (response.ok && data.success) {
        setRecoveryCodes(data.recoveryCodes)
        setStep('recovery')
      } else {
        setError(data.error ?? 'Verification failed')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleDisable(e: React.FormEvent) {
    e.preventDefault()
    setDisableError('')
    setDisableLoading(true)

    const formData = new FormData()
    formData.set('code', disableCode.trim())

    const result = await disableMfa(formData)

    if (result.error) {
      setDisableError(result.error)
      setDisableLoading(false)
    } else {
      router.refresh()
    }
  }

  // MFA is already enabled -- show status and disable option
  if (mfaEnabled && step === 'idle') {
    return (
      <Card className="rounded-xl border-0 card-warm">
        <CardHeader>
          <CardTitle className="font-sans text-xl tracking-tight">
            Two-Factor Authentication
          </CardTitle>
          <CardDescription>
            MFA is currently enabled on your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-green-50 p-3 text-sm text-green-800 dark:bg-green-950 dark:text-green-200">
            Your account is protected with two-factor authentication.
          </div>

          {!showDisable ? (
            <Button
              variant="outline"
              className="mt-4 rounded-lg"
              onClick={() => setShowDisable(true)}
            >
              Disable MFA
            </Button>
          ) : (
            <form onSubmit={handleDisable} className="mt-4 space-y-3">
              <div className="space-y-2">
                <Label htmlFor="disable-code">
                  Enter your authenticator code to disable MFA
                </Label>
                <Input
                  id="disable-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  value={disableCode}
                  onChange={(e) => setDisableCode(e.target.value)}
                  maxLength={6}
                  className="max-w-[200px] text-center text-lg tracking-widest"
                />
              </div>
              {disableError && (
                <p className="text-sm text-destructive">{disableError}</p>
              )}
              <div className="flex gap-2">
                <Button
                  type="submit"
                  variant="destructive"
                  className="rounded-lg"
                  disabled={disableLoading || !disableCode.trim()}
                >
                  {disableLoading ? 'Disabling...' : 'Confirm Disable'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-lg"
                  onClick={() => { setShowDisable(false); setDisableCode(''); setDisableError('') }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    )
  }

  // Step: idle -- show enable button
  if (step === 'idle') {
    return (
      <Card className="rounded-xl border-0 card-warm">
        <CardHeader>
          <CardTitle className="font-sans text-xl tracking-tight">
            Two-Factor Authentication
          </CardTitle>
          <CardDescription>
            Add an extra layer of security to your account by requiring a code from your
            authenticator app when signing in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
          <Button
            className="rounded-lg"
            onClick={handleStartSetup}
            disabled={loading}
          >
            {loading ? 'Setting up...' : 'Enable MFA'}
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Step: scanning -- show QR code and verify
  if (step === 'scanning') {
    return (
      <Card className="rounded-xl border-0 card-warm">
        <CardHeader>
          <CardTitle className="font-sans text-xl tracking-tight">
            Set Up Authenticator
          </CardTitle>
          <CardDescription>
            Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.),
            then enter the 6-digit code to verify.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrCodeDataUrl}
              alt="MFA QR Code"
              width={256}
              height={256}
              className="rounded-lg"
            />
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              Can&apos;t scan the QR code? Enter this key manually:
            </p>
            <code className="block rounded bg-muted px-3 py-2 text-sm font-mono break-all">
              {secret}
            </code>
          </div>

          <form onSubmit={handleVerify} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="verify-code">Verification code</Label>
              <Input
                id="verify-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value)}
                maxLength={6}
                className="max-w-[200px] text-center text-lg tracking-widest"
                autoFocus
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button
                type="submit"
                className="rounded-lg"
                disabled={loading || verifyCode.trim().length !== 6}
              >
                {loading ? 'Verifying...' : 'Verify & Enable'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-lg"
                onClick={() => { setStep('idle'); setError('') }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    )
  }

  // Step: recovery -- show recovery codes
  if (step === 'recovery') {
    return (
      <Card className="rounded-xl border-0 card-warm">
        <CardHeader>
          <CardTitle className="font-sans text-xl tracking-tight">
            Save Your Recovery Codes
          </CardTitle>
          <CardDescription>
            Store these codes in a safe place. Each code can only be used once.
            If you lose access to your authenticator app, you can use a recovery code to sign in.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/50 p-4">
            <div className="grid grid-cols-2 gap-2">
              {recoveryCodes.map((code) => (
                <code key={code} className="text-sm font-mono">
                  {code}
                </code>
              ))}
            </div>
          </div>

          <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
            These codes will not be shown again. Make sure to save them now.
          </div>

          <Button
            className="rounded-lg"
            onClick={() => {
              setStep('done')
              router.refresh()
            }}
          >
            I&apos;ve Saved My Codes
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Step: done
  return (
    <Card className="rounded-xl border-0 card-warm">
      <CardHeader>
        <CardTitle className="font-sans text-xl tracking-tight">
          Two-Factor Authentication
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg bg-green-50 p-3 text-sm text-green-800 dark:bg-green-950 dark:text-green-200">
          MFA has been successfully enabled on your account.
        </div>
      </CardContent>
    </Card>
  )
}
