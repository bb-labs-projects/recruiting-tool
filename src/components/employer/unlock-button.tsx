import { Button } from '@/components/ui/button'
import { Lock } from 'lucide-react'

/**
 * Unlock Profile CTA button.
 * Currently a non-functional placeholder -- Phase 6 will wire this
 * to Stripe Checkout for profile unlock payments.
 */
export function UnlockButton({ profileId }: { profileId: string }) {
  return (
    <Button variant="default" size="lg" disabled>
      <Lock className="size-4" />
      Unlock Full Profile
    </Button>
  )
}
