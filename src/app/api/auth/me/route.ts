import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { sessions } from '@/lib/db/schema'
import { eq, and, gt } from 'drizzle-orm'
import { decrypt } from '@/lib/auth/session'
import { AUTH_CONSTANTS } from '@/lib/auth/constants'

/**
 * GET /api/auth/me
 *
 * Returns the current authenticated user or 401.
 * Does NOT use the DAL (which redirects on failure) -- this is an API
 * route that should return JSON errors, not redirect.
 */
export async function GET() {
  try {
    // Read and decrypt the session cookie
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get(
      AUTH_CONSTANTS.SESSION_COOKIE_NAME
    )?.value

    const payload = await decrypt(sessionCookie)

    if (!payload?.sessionId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Verify session exists in database and is not expired
    const [session] = await db
      .select({ id: sessions.id, userId: sessions.userId })
      .from(sessions)
      .where(
        and(
          eq(sessions.id, payload.sessionId),
          gt(sessions.expiresAt, new Date())
        )
      )
      .limit(1)

    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Fetch user data
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

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Auth me route error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
