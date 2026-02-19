import 'server-only'

import { db } from '@/lib/db'
import { users, magicLinkTokens } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { generateToken } from '@/lib/auth/magic-link'
import { checkRateLimit } from '@/lib/auth/rate-limit'
import { sendMagicLinkEmail } from '@/lib/email/magic-link-email'
import { AUTH_CONSTANTS } from '@/lib/auth/constants'
import { logSecurityEvent } from '@/lib/auth/security-log'

export type MagicLinkResult =
  | { success: true }
  | { success: false; error: string; rateLimited?: boolean }

/**
 * Shared magic link request logic used by both the API route and server action.
 *
 * Flow: normalize email -> find/create user -> check rate limit ->
 * generate token -> store hash -> send email -> log event -> return success.
 *
 * Always returns { success: true } for non-rate-limited requests to prevent
 * email enumeration (even if the user is inactive).
 */
export async function handleMagicLinkRequest(params: {
  email: string
  ip: string
  userAgent: string
}): Promise<MagicLinkResult> {
  const { ip, userAgent } = params
  const email = params.email.toLowerCase().trim()

  try {
    // Look up user by email
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    let userId: string

    if (!existingUser) {
      // Auto-create user with role=candidate, emailVerified=false
      const [newUser] = await db
        .insert(users)
        .values({ email, role: 'candidate', emailVerified: false })
        .returning({ id: users.id })

      userId = newUser.id
    } else {
      userId = existingUser.id

      // If user is inactive, silently return success (no enumeration leak)
      if (!existingUser.isActive) {
        logSecurityEvent({
          event: 'magic_link_requested',
          userId,
          email,
          ip,
          userAgent,
          timestamp: new Date().toISOString(),
          success: false,
          failureReason: 'User account is inactive',
        })
        return { success: true }
      }
    }

    // Check rate limit
    const rateLimit = await checkRateLimit(userId)
    if (!rateLimit.allowed) {
      logSecurityEvent({
        event: 'magic_link_requested',
        userId,
        email,
        ip,
        userAgent,
        timestamp: new Date().toISOString(),
        success: false,
        failureReason: 'Rate limited',
      })
      return {
        success: false,
        error: 'Too many requests. Please try again later.',
        rateLimited: true,
      }
    }

    // Generate token (raw token for email, hash for storage)
    const { token, tokenHash } = generateToken()

    // Store token hash in database
    const expiresAt = new Date(
      Date.now() + AUTH_CONSTANTS.MAGIC_LINK_EXPIRY_MINUTES * 60 * 1000
    )

    await db.insert(magicLinkTokens).values({
      userId,
      tokenHash,
      expiresAt,
      ipAddress: ip,
      userAgent,
    })

    // Send the raw token via email (NOT the hash)
    await sendMagicLinkEmail(email, token)

    // Log success
    logSecurityEvent({
      event: 'magic_link_requested',
      userId,
      email,
      ip,
      userAgent,
      timestamp: new Date().toISOString(),
      success: true,
    })

    return { success: true }
  } catch (error) {
    console.error('Magic link request error:', error)
    return { success: false, error: 'Something went wrong. Please try again.' }
  }
}
