import 'server-only'

import { cache } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { decrypt } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { users, sessions } from '@/lib/db/schema'
import { eq, and, gt } from 'drizzle-orm'
import { AUTH_CONSTANTS } from '@/lib/auth/constants'

/**
 * Verify the current session against the database.
 * Wrapped in cache() for request deduplication -- multiple calls within the
 * same request only hit the database once.
 *
 * - Valid session -> returns { userId, sessionId }
 * - Invalid/missing JWT -> deletes cookie, redirects to /login
 * - Session not in DB -> deletes cookie, redirects to /login
 * - DB error -> throws (caught by error boundary, NOT a redirect —
 *   redirecting to /login on DB errors creates an infinite loop with
 *   the proxy which redirects authenticated users back to the dashboard)
 */
export const verifySession = cache(async () => {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(AUTH_CONSTANTS.SESSION_COOKIE_NAME)?.value

  const payload = await decrypt(sessionCookie)

  if (!payload?.sessionId) {
    cookieStore.delete(AUTH_CONSTANTS.SESSION_COOKIE_NAME)
    redirect('/login')
  }

  // Verify session exists in database and is not expired.
  // DB errors are NOT caught here — they propagate to the error boundary.
  // This prevents a redirect loop: proxy redirects /login -> dashboard,
  // but if verifySession redirects dashboard -> /login on DB error,
  // the proxy sends them right back, looping forever.
  const [session] = await db
    .select({
      id: sessions.id,
      userId: sessions.userId,
    })
    .from(sessions)
    .where(
      and(
        eq(sessions.id, payload.sessionId),
        gt(sessions.expiresAt, new Date())
      )
    )
    .limit(1)

  if (!session) {
    // Session genuinely not found or expired — clear the cookie
    cookieStore.delete(AUTH_CONSTANTS.SESSION_COOKIE_NAME)
    redirect('/login')
  }

  return {
    userId: session.userId,
    sessionId: session.id,
  }
})

/**
 * Get the current authenticated user from the database.
 * Calls verifySession() first to ensure authentication.
 * Wrapped in cache() for request deduplication.
 *
 * DB errors propagate (caught by error boundary).
 * Returns null only if the user row genuinely doesn't exist.
 */
export const getUser = cache(async () => {
  const session = await verifySession()

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      emailVerified: users.emailVerified,
      mfaEnabled: users.mfaEnabled,
    })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1)

  return user ?? null
})
