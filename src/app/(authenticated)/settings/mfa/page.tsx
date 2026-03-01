import type { Metadata } from 'next'
import { getUser } from '@/lib/dal'
import { redirect } from 'next/navigation'
import { MfaSetupForm } from '@/components/settings/mfa-setup-form'

export const metadata: Metadata = {
  title: 'MFA Settings',
}

export default async function MfaSettingsPage() {
  const user = await getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="font-sans text-2xl font-bold tracking-tight">
          Security Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage two-factor authentication for your account.
        </p>
      </div>
      <MfaSetupForm mfaEnabled={user.mfaEnabled} />
    </div>
  )
}
