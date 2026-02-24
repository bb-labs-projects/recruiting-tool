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
 * This is a server-side check (Node.js runtime) that serves as a
 * fallback in case the proxy redirect doesn't fire.
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

  return <MagicLinkForm />
}
