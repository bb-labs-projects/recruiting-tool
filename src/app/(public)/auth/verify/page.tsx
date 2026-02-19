import { Suspense } from 'react'
import type { Metadata } from 'next'
import { MagicLinkVerify } from '@/components/auth/magic-link-verify'

export const metadata: Metadata = {
  title: 'Verify Login',
}

/**
 * Verify page -- renders the two-step token confirmation UI.
 * Wrapped in Suspense because MagicLinkVerify uses useSearchParams,
 * which requires a Suspense boundary in Next.js.
 * Renders within the centered public layout.
 */
export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      }
    >
      <MagicLinkVerify />
    </Suspense>
  )
}
