import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import { users, mfaRecoveryCodes } from '@/lib/db/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { decrypt, createSession } from '@/lib/auth/session'
import { hashRecoveryCode } from '@/lib/auth/mfa'
import { AUTH_CONSTANTS } from '@/lib/auth/constants'

/**
 * POST /api/auth/mfa/recovery
 *
 * Verify a recovery code during MFA challenge.
 * Requires a session cookie with mfaVerified=false.
 */
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get(AUTH_CONSTANTS.SESSION_COOKIE_NAME)?.value
    const session = await decrypt(sessionCookie)

    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const code = (body.code as string)?.trim()

    if (!code) {
      return NextResponse.json(
        { error: 'Recovery code is required' },
        { status: 400 }
      )
    }

    // Get user info
    const [user] = await db
      .select({
        id: users.id,
        role: users.role,
        mfaEnabled: users.mfaEnabled,
      })
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1)

    if (!user || !user.mfaEnabled) {
      return NextResponse.json({ error: 'MFA is not enabled' }, { status: 400 })
    }

    // Hash the provided recovery code and look it up
    const codeHash = hashRecoveryCode(code)
    const [recoveryCode] = await db
      .select({ id: mfaRecoveryCodes.id })
      .from(mfaRecoveryCodes)
      .where(
        and(
          eq(mfaRecoveryCodes.userId, user.id),
          eq(mfaRecoveryCodes.codeHash, codeHash),
          isNull(mfaRecoveryCodes.usedAt)
        )
      )
      .limit(1)

    if (!recoveryCode) {
      return NextResponse.json(
        { error: 'Invalid recovery code. Please check and try again.' },
        { status: 401 }
      )
    }

    // Mark recovery code as used
    await db.update(mfaRecoveryCodes).set({
      usedAt: new Date(),
    }).where(eq(mfaRecoveryCodes.id, recoveryCode.id))

    // Update mfaVerifiedAt timestamp
    await db.update(users).set({
      mfaVerifiedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(users.id, user.id))

    // Re-create session with mfaVerified=true
    await createSession(session.sessionId, user.id, user.role, true)

    // Determine redirect based on role
    const redirectTo = getDefaultRedirect(user.role)
    return NextResponse.json({ success: true, redirectTo })
  } catch (error) {
    console.error('MFA recovery error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function getDefaultRedirect(role: string): string {
  switch (role) {
    case 'admin': return '/admin'
    case 'employer': return '/employer'
    case 'candidate': return '/candidate'
    default: return '/'
  }
}
