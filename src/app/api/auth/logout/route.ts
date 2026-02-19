import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import { sessions } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { decrypt, deleteSession } from '@/lib/auth/session'
import { AUTH_CONSTANTS } from '@/lib/auth/constants'
import {
  logSecurityEvent,
  buildSecurityContext,
} from '@/lib/auth/security-log'

/**
 * POST /api/auth/logout
 *
 * Destroys the session: deletes the DB record and clears the cookie.
 */
export async function POST(request: Request) {
  try {
    const { ip, userAgent } = buildSecurityContext(request)

    // Read and decrypt the session cookie
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get(
      AUTH_CONSTANTS.SESSION_COOKIE_NAME
    )?.value

    const payload = await decrypt(sessionCookie)

    if (payload?.sessionId) {
      // Delete session record from database
      await db
        .delete(sessions)
        .where(eq(sessions.id, payload.sessionId))

      logSecurityEvent({
        event: 'logout',
        userId: payload.userId,
        email: 'session',
        ip,
        userAgent,
        timestamp: new Date().toISOString(),
        success: true,
      })
    }

    // Clear the session cookie (always, even if no valid session)
    await deleteSession()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Logout route error:', error)

    // Still try to clear the cookie on error
    try {
      await deleteSession()
    } catch {
      // Ignore cookie clearing error
    }

    return NextResponse.json({ success: true })
  }
}
