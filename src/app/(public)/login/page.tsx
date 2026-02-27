import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { decrypt } from '@/lib/auth/session'
import { MagicLinkForm } from '@/components/auth/magic-link-form'

export const metadata: Metadata = {
  title: 'Sign In',
}

/**
 * Login page -- redirects authenticated users to their dashboard,
 * renders the magic link form for unauthenticated users.
 *
 * Uses a split layout: dark branded left half, white form right half.
 * On mobile the left half collapses to a small header bar.
 */
export default async function LoginPage() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')?.value

  if (sessionCookie) {
    const session = await decrypt(sessionCookie)

    if (session?.role) {
      switch (session.role) {
        case 'admin':
          redirect('/admin')
        case 'employer':
          redirect('/employer')
        case 'candidate':
          redirect('/candidate')
      }
    }
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Left half - dark branding panel */}
      {/* Mobile: small header bar */}
      <div className="flex h-14 shrink-0 items-center bg-sidebar px-6 md:hidden">
        <span className="font-sans text-lg font-semibold text-white">
          Cromwell Chase
        </span>
      </div>

      {/* Desktop: full half panel */}
      <div className="hidden md:flex md:w-1/2 md:flex-col bg-sidebar p-12">
        <span className="font-sans text-lg font-semibold text-white">
          Cromwell Chase
        </span>
        <div className="flex flex-1 items-center justify-center">
          <p className="text-base text-[oklch(0.60_0_0)]">
            Legal executive search, by legal professionals
          </p>
        </div>
      </div>

      {/* Right half - white form panel */}
      <div className="flex flex-1 items-center justify-center bg-white px-6 md:w-1/2">
        <div className="w-full max-w-sm px-0 md:px-12">
          <MagicLinkForm />
        </div>
      </div>
    </div>
  )
}
