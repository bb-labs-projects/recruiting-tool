import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { decrypt } from '@/lib/auth/session'
import { generateMfaSecret } from '@/lib/auth/mfa'
import { AUTH_CONSTANTS } from '@/lib/auth/constants'
import * as QRCode from 'qrcode'

/**
 * POST /api/auth/mfa/setup
 *
 * Generate a new MFA secret and QR code for setup.
 * Requires an authenticated session.
 */
export async function POST() {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get(AUTH_CONSTANTS.SESSION_COOKIE_NAME)?.value
    const session = await decrypt(sessionCookie)

    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get user email
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        mfaEnabled: users.mfaEnabled,
      })
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1)

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.mfaEnabled) {
      return NextResponse.json({ error: 'MFA is already enabled' }, { status: 400 })
    }

    // Generate new secret
    const { secret, otpauthUrl } = generateMfaSecret(user.email)

    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
      width: 256,
      margin: 2,
    })

    return NextResponse.json({
      secret,
      qrCodeDataUrl,
    })
  } catch (error) {
    console.error('MFA setup error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
