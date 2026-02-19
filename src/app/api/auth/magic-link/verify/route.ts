import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { magicLinkTokens, users, sessions } from '@/lib/db/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { hashToken, generateToken } from '@/lib/auth/magic-link'
import { createSession } from '@/lib/auth/session'
import { AUTH_CONSTANTS } from '@/lib/auth/constants'
import {
  logSecurityEvent,
  buildSecurityContext,
} from '@/lib/auth/security-log'

const VerifySchema = z.object({
  token: z.string().min(1, 'Token is required'),
})

/**
 * POST /api/auth/magic-link/verify
 *
 * Validates a magic link token, creates a session, and sets a cookie.
 * POST-only to prevent email client prefetch from consuming tokens.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = VerifySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

    const { ip, userAgent } = buildSecurityContext(request)
    const tokenHash = hashToken(parsed.data.token)

    // Find unused token by hash
    const [tokenRecord] = await db
      .select()
      .from(magicLinkTokens)
      .where(
        and(
          eq(magicLinkTokens.tokenHash, tokenHash),
          isNull(magicLinkTokens.usedAt)
        )
      )
      .limit(1)

    if (!tokenRecord) {
      logSecurityEvent({
        event: 'magic_link_invalid',
        userId: null,
        email: 'unknown',
        ip,
        userAgent,
        timestamp: new Date().toISOString(),
        success: false,
        failureReason: 'Token not found or already used',
      })
      return NextResponse.json(
        { error: 'Invalid or already used token.' },
        { status: 401 }
      )
    }

    // Check expiration
    if (tokenRecord.expiresAt < new Date()) {
      logSecurityEvent({
        event: 'magic_link_expired',
        userId: tokenRecord.userId,
        email: 'unknown',
        ip,
        userAgent,
        timestamp: new Date().toISOString(),
        success: false,
        failureReason: 'Token expired',
      })
      return NextResponse.json(
        { error: 'This link has expired. Please request a new one.' },
        { status: 401 }
      )
    }

    // Mark token as used FIRST to prevent race conditions
    await db
      .update(magicLinkTokens)
      .set({ usedAt: new Date() })
      .where(eq(magicLinkTokens.id, tokenRecord.id))

    // Look up the user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, tokenRecord.userId))
      .limit(1)

    if (!user) {
      return NextResponse.json(
        { error: 'User not found.' },
        { status: 401 }
      )
    }

    // Update user: mark email as verified and record last login
    await db
      .update(users)
      .set({
        emailVerified: true,
        lastLoginAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))

    // Create session record in database
    const { tokenHash: sessionTokenHash } = generateToken()
    const sessionExpiresAt = new Date(
      Date.now() + AUTH_CONSTANTS.SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000
    )

    const [sessionRecord] = await db
      .insert(sessions)
      .values({
        userId: user.id,
        tokenHash: sessionTokenHash,
        expiresAt: sessionExpiresAt,
        ipAddress: ip,
        userAgent,
      })
      .returning({ id: sessions.id })

    // Set encrypted session cookie
    await createSession(sessionRecord.id, user.id, user.role)

    // Log security events
    logSecurityEvent({
      event: 'magic_link_verified',
      userId: user.id,
      email: user.email,
      ip,
      userAgent,
      timestamp: new Date().toISOString(),
      success: true,
    })

    logSecurityEvent({
      event: 'session_created',
      userId: user.id,
      email: user.email,
      ip,
      userAgent,
      timestamp: new Date().toISOString(),
      success: true,
    })

    // Determine redirect path
    const redirectTo =
      tokenRecord.redirectPath && tokenRecord.redirectPath !== '/'
        ? tokenRecord.redirectPath
        : getDefaultRedirect(user.role)

    return NextResponse.json({ success: true, redirectTo })
  } catch (error) {
    console.error('Magic link verify route error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Get default redirect path based on user role.
 */
function getDefaultRedirect(role: string): string {
  switch (role) {
    case 'admin':
      return '/admin'
    case 'employer':
      return '/employer'
    case 'candidate':
      return '/candidate'
    default:
      return '/'
  }
}
