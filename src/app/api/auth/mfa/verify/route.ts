import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { decrypt, createSession } from '@/lib/auth/session'
import { verifyTotpCode, decryptSecret } from '@/lib/auth/mfa'
import { AUTH_CONSTANTS } from '@/lib/auth/constants'

/**
 * POST /api/auth/mfa/verify
 *
 * Verify a TOTP code during MFA challenge.
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

    if (!code || code.length !== 6 || !/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: 'Please enter a valid 6-digit code' },
        { status: 400 }
      )
    }

    // Get user's MFA secret
    const [user] = await db
      .select({
        id: users.id,
        role: users.role,
        mfaSecret: users.mfaSecret,
        mfaEnabled: users.mfaEnabled,
      })
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1)

    if (!user || !user.mfaEnabled || !user.mfaSecret) {
      return NextResponse.json({ error: 'MFA is not enabled' }, { status: 400 })
    }

    // Decrypt and verify
    const secret = decryptSecret(user.mfaSecret)
    if (!verifyTotpCode(secret, code)) {
      return NextResponse.json({ error: 'Invalid code. Please try again.' }, { status: 401 })
    }

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
    console.error('MFA verify error:', error)
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
