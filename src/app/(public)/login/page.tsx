import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { decrypt } from '@/lib/auth/session'
import { AUTH_CONSTANTS } from '@/lib/auth/constants'
import { MagicLinkForm } from '@/components/auth/magic-link-form'

export const metadata: Metadata = {
  title: 'Sign In',
}

/**
 * Login page -- renders the magic link email form.
 * If the user already has a valid session, redirects to the root page
 * which routes them to the appropriate dashboard.
 */
export default async function LoginPage() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(AUTH_CONSTANTS.SESSION_COOKIE_NAME)?.value
  const session = await decrypt(sessionCookie)

  if (session?.role) {
    redirect('/')
  }

  return <MagicLinkForm />
}
