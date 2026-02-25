import type { Metadata } from 'next'
import { MfaChallengeForm } from '@/components/auth/mfa-challenge-form'

export const metadata: Metadata = {
  title: 'Two-Factor Authentication',
}

/**
 * MFA challenge page -- shown when a user with MFA enabled
 * has authenticated via magic link but hasn't yet verified their TOTP code.
 */
export default function MfaChallengePage() {
  return (
    <div className="flex justify-center">
      <MfaChallengeForm />
    </div>
  )
}
