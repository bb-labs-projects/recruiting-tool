'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Lock, Unlock, Loader2 } from 'lucide-react'
import { createCheckoutSession } from '@/actions/checkout'

/**
 * Unlock Profile CTA button.
 * Wired to Stripe Checkout -- calls createCheckoutSession server action on click.
 * Shows loading state during redirect and prevents double-clicks via useTransition.
 * When already unlocked, shows a disabled "Profile Unlocked" badge state.
 */
export function UnlockButton({
  profileId,
  isUnlocked,
}: {
  profileId: string
  isUnlocked?: boolean
}) {
  const [isPending, startTransition] = useTransition()

  if (isUnlocked) {
    return (
      <Button variant="outline" size="lg" disabled>
        <Unlock className="size-4" />
        Profile Unlocked
      </Button>
    )
  }

  return (
    <Button
      variant="default"
      size="lg"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          await createCheckoutSession(profileId)
        })
      }}
    >
      {isPending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Processing...
        </>
      ) : (
        <>
          <Lock className="size-4" />
          Unlock Full Profile
        </>
      )}
    </Button>
  )
}
