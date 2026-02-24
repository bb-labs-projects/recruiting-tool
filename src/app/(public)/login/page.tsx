import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { decrypt } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { sessions } from '@/lib/db/schema'
import { eq, and, gt } from 'drizzle-orm'
import { AUTH_CONSTANTS } from '@/lib/auth/constants'
import { MagicLinkForm } from '@/components/auth/magic-link-form'

export const metadata: Metadata = {
  title: 'Sign In',
}

/**
 * Login page -- renders the magic link email form.
 * If the user already has a valid session verified against the DB,
 * redirects directly to their role-based dashboard.
 */
export default async function LoginPage() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(AUTH_CONSTANTS.SESSION_COOKIE_NAME)?.value
  const payload = await decrypt(sessionCookie)

  if (payload?.sessionId && payload?.role) {
    // Verify the session actually exists in the DB before redirecting
    try {
      const [session] = await db
        .select({ id: sessions.id })
        .from(sessions)
        .where(
          and(
            eq(sessions.id, payload.sessionId),
            gt(sessions.expiresAt, new Date())
          )
        )
        .limit(1)

      if (session) {
        switch (payload.role) {
          case 'admin':
            redirect('/admin')
          case 'employer':
            redirect('/employer')
          case 'candidate':
            redirect('/candidate')
          default:
            redirect('/')
        }
      } else {
        // Session expired or deleted — clear stale cookie
        cookieStore.delete(AUTH_CONSTANTS.SESSION_COOKIE_NAME)
      }
    } catch (error) {
      // DB error — don't delete cookie, just show login form
      console.error('Login page session check error:', error)
    }
  }

  return <MagicLinkForm />
}
