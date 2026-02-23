import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { decrypt } from '@/lib/auth/session'
import { AUTH_CONSTANTS } from '@/lib/auth/constants'
import { db } from '@/lib/db'
import { users, sessions } from '@/lib/db/schema'
import { eq, and, gt } from 'drizzle-orm'
import { profiles } from '@/lib/db/schema'

/**
 * GET /api/debug/session — diagnose session + dashboard rendering issues.
 * Tests every step that the candidate dashboard would run.
 */
export async function GET() {
  const steps: Record<string, unknown> = {}

  try {
    // Step 1: Read cookie
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get(AUTH_CONSTANTS.SESSION_COOKIE_NAME)?.value
    steps.cookie_exists = !!sessionCookie

    if (!sessionCookie) {
      return NextResponse.json({ ...steps, error: 'No session cookie' })
    }

    // Step 2: Decrypt JWT
    const payload = await decrypt(sessionCookie)
    steps.jwt_valid = !!payload
    steps.jwt_role = payload?.role ?? null

    if (!payload?.sessionId) {
      return NextResponse.json({ ...steps, error: 'JWT invalid or missing sessionId' })
    }

    // Step 3: Verify session in DB
    const [session] = await db
      .select({ id: sessions.id, userId: sessions.userId })
      .from(sessions)
      .where(and(eq(sessions.id, payload.sessionId), gt(sessions.expiresAt, new Date())))
      .limit(1)

    steps.session_in_db = !!session

    if (!session) {
      return NextResponse.json({ ...steps, error: 'Session not found or expired in DB' })
    }

    // Step 4: Get user
    const [user] = await db
      .select({ id: users.id, email: users.email, role: users.role })
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1)

    steps.user_found = !!user
    steps.user_role = user?.role ?? null

    if (!user) {
      return NextResponse.json({ ...steps, error: 'User not found' })
    }

    // Step 5: Get candidate profile (same query as dashboard)
    try {
      const profile = await db.query.profiles.findFirst({
        where: eq(profiles.userId, user.id),
        with: {
          education: true,
          workHistory: true,
          barAdmissions: true,
          profileSpecializations: { with: { specialization: true } },
          profileTechnicalDomains: { with: { technicalDomain: true } },
          cvUploads: true,
        },
      })

      steps.profile_found = !!profile
      steps.profile_status = profile?.status ?? null
      steps.profile_name = profile?.name ?? null
    } catch (error) {
      steps.profile_error = error instanceof Error ? error.message : String(error)
    }

    return NextResponse.json(steps)
  } catch (error) {
    return NextResponse.json({
      ...steps,
      fatal_error: error instanceof Error ? error.message : String(error),
    }, { status: 500 })
  }
}
