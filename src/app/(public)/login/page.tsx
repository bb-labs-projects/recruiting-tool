import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { decrypt } from '@/lib/auth/session'
import { MagicLinkForm } from '@/components/auth/magic-link-form'

export const dynamic = 'force-dynamic'

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

  const isPreviewMode = process.env.PREVIEW_MODE === 'true'

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

      {/* Right half - form or role switcher */}
      <div className="flex flex-1 items-center justify-center bg-white px-6 md:w-1/2">
        <div className="w-full max-w-sm px-0 md:px-12">
          {isPreviewMode ? (
            <div>
              <h2 className="text-lg font-semibold mb-1">Preview Mode</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Select a role to view the app
              </p>
              <div className="flex flex-col gap-3">
                <a
                  href="/api/dev/preview?role=employer"
                  className="flex items-center justify-center rounded-md bg-brand px-4 py-3 text-sm font-medium text-brand-foreground transition-opacity hover:opacity-90"
                >
                  Employer
                </a>
                <a
                  href="/api/dev/preview?role=candidate"
                  className="flex items-center justify-center rounded-md bg-brand px-4 py-3 text-sm font-medium text-brand-foreground transition-opacity hover:opacity-90"
                >
                  Candidate
                </a>
                <a
                  href="/api/dev/preview?role=admin"
                  className="flex items-center justify-center rounded-md border border-border px-4 py-3 text-sm font-medium transition-colors hover:bg-muted"
                >
                  Admin
                </a>
              </div>
            </div>
          ) : (
            <MagicLinkForm />
          )}
        </div>
      </div>
    </div>
  )
}
