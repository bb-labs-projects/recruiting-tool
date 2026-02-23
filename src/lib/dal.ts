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
 * If no valid session exists, redirects to /login (never returns null).
 */
export const verifySession = cache(async () => {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(AUTH_CONSTANTS.SESSION_COOKIE_NAME)?.value

  const payload = await decrypt(sessionCookie)

  if (!payload?.sessionId) {
    cookieStore.delete(AUTH_CONSTANTS.SESSION_COOKIE_NAME)
    redirect('/login')
  }

  // Verify session exists in database and is not expired
  let session: { id: string; userId: string } | undefined
  try {
    ;[session] = await db
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
  } catch (error) {
    console.error('verifySession DB error:', error)
    cookieStore.delete(AUTH_CONSTANTS.SESSION_COOKIE_NAME)
    redirect('/login')
  }

  if (!session) {
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
 */
export const getUser = cache(async () => {
  const session = await verifySession()

  try {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        emailVerified: users.emailVerified,
      })
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1)

    return user ?? null
  } catch (error) {
    console.error('getUser DB error:', error)
    return null
  }
})
