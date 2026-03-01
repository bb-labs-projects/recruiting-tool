import 'server-only'

import { cache } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { decrypt } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { users, sessions } from '@/lib/db/schema'
import { eq, and, gt } from 'drizzle-orm'
import { AUTH_CONSTANTS } from '@/lib/auth/constants'

// ---------------------------------------------------------------------------
// Dev-preview helpers (never active in production)
// ---------------------------------------------------------------------------

const DEV_PREVIEW_USER_IDS: Record<string, string> = {
  admin: '00000000-0000-0000-0000-000000000001',
  employer: '00000000-0000-0000-0000-000000000002',
  candidate: '00000000-0000-0000-0000-000000000003',
}

const DEV_PREVIEW_EMAILS: Record<string, string> = {
  admin: 'admin@dev-preview.local',
  employer: 'employer@dev-preview.local',
  candidate: 'candidate@dev-preview.local',
}

function isDevPreviewEnabled() {
  return process.env.NODE_ENV !== 'production' || process.env.PREVIEW_MODE === 'true'
}

// ---------------------------------------------------------------------------

/**
 * Verify the current session against the database.
 * Wrapped in cache() for request deduplication -- multiple calls within the
 * same request only hit the database once.
 *
 * - Valid session -> returns { userId, sessionId }
 * - Invalid/missing JWT -> deletes cookie, redirects to /login
 * - Session not in DB -> deletes cookie, redirects to /login
 * - DB error -> throws (caught by error boundary, NOT a redirect --
 *   redirecting to /login on DB errors creates an infinite loop with
 *   the proxy which redirects authenticated users back to the dashboard)
 *
 * In dev mode, sessions with `devPreview: true` skip the database entirely
 * and return a synthetic session derived from the JWT claims.
 */
export const verifySession = cache(async () => {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(AUTH_CONSTANTS.SESSION_COOKIE_NAME)?.value

  const payload = await decrypt(sessionCookie)

  if (!payload?.sessionId) {
    cookieStore.delete(AUTH_CONSTANTS.SESSION_COOKIE_NAME)
    redirect('/login')
  }

  // Dev-preview bypass: trust the JWT without hitting the database.
  if (payload.devPreview && isDevPreviewEnabled()) {
    return {
      userId: payload.userId,
      sessionId: payload.sessionId,
      devPreview: true as const,
      role: payload.role,
    }
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
 *
 * In dev mode, dev-preview sessions return a mock user object so that
 * pages render without a database connection.
 */
export const getUser = cache(async () => {
  const session = await verifySession()

  // Dev-preview bypass: return a synthetic user.
  if ('devPreview' in session && session.devPreview && isDevPreviewEnabled()) {
    const role = session.role as string
    return {
      id: DEV_PREVIEW_USER_IDS[role] ?? DEV_PREVIEW_USER_IDS.employer!,
      email: DEV_PREVIEW_EMAILS[role] ?? DEV_PREVIEW_EMAILS.employer!,
      role: role as 'admin' | 'employer' | 'candidate',
      emailVerified: true,
      mfaEnabled: false,
    }
  }

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
