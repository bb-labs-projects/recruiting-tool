import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { decrypt } from '@/lib/auth/session'
import { AUTH_CONSTANTS } from '@/lib/auth/constants'

/**
 * Root page -- never renders UI.
 * Reads the session cookie and redirects:
 * - Authenticated users -> role-based dashboard
 * - Unauthenticated users -> /login
 */
export default async function RootPage() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(AUTH_CONSTANTS.SESSION_COOKIE_NAME)?.value

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

  redirect('/login')
}
