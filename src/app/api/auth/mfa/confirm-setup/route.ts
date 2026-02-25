import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import { users, mfaRecoveryCodes } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { decrypt } from '@/lib/auth/session'
import {
  verifyTotpCode,
  encryptSecret,
  generateRecoveryCodes,
  hashRecoveryCode,
} from '@/lib/auth/mfa'
import { AUTH_CONSTANTS } from '@/lib/auth/constants'

/**
 * POST /api/auth/mfa/confirm-setup
 *
 * Confirm MFA setup by verifying a TOTP code, then store the encrypted secret
 * and generate recovery codes.
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
    const { secret, code } = body as { secret: string; code: string }

    if (!secret || !code) {
      return NextResponse.json(
        { error: 'Secret and verification code are required' },
        { status: 400 }
      )
    }

    const trimmedCode = code.trim()
    if (trimmedCode.length !== 6 || !/^\d{6}$/.test(trimmedCode)) {
      return NextResponse.json(
        { error: 'Please enter a valid 6-digit code' },
        { status: 400 }
      )
    }

    // Verify the code against the provided secret
    if (!verifyTotpCode(secret, trimmedCode)) {
      return NextResponse.json(
        { error: 'Invalid code. Please check your authenticator app and try again.' },
        { status: 400 }
      )
    }

    // Check user exists and MFA not already enabled
    const [user] = await db
      .select({ id: users.id, mfaEnabled: users.mfaEnabled })
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1)

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.mfaEnabled) {
      return NextResponse.json({ error: 'MFA is already enabled' }, { status: 400 })
    }

    // Encrypt and store the secret
    const encryptedSecret = encryptSecret(secret)
    await db.update(users).set({
      mfaSecret: encryptedSecret,
      mfaEnabled: true,
      mfaVerifiedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(users.id, user.id))

    // Generate recovery codes
    const recoveryCodes = generateRecoveryCodes()

    // Hash and store recovery codes
    const codeRecords = recoveryCodes.map((code) => ({
      userId: user.id,
      codeHash: hashRecoveryCode(code),
    }))

    await db.insert(mfaRecoveryCodes).values(codeRecords)

    return NextResponse.json({
      success: true,
      recoveryCodes,
    })
  } catch (error) {
    console.error('MFA confirm-setup error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
