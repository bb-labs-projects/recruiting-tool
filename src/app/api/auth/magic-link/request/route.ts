import { NextResponse } from 'next/server'
import { z } from 'zod'
import { handleMagicLinkRequest } from '@/lib/auth/request-magic-link'
import { buildSecurityContext } from '@/lib/auth/security-log'

const RequestSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

/**
 * POST /api/auth/magic-link/request
 *
 * Creates a magic link token, stores its hash, and sends an email.
 * Always returns success to prevent email enumeration (except rate limiting).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = RequestSchema.safeParse(body)

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors
      const message =
        fieldErrors.email?.[0] ?? 'Invalid request body'
      return NextResponse.json({ error: message }, { status: 400 })
    }

    const { ip, userAgent } = buildSecurityContext(request)

    const result = await handleMagicLinkRequest({
      email: parsed.data.email,
      ip,
      userAgent,
    })

    // Rate limited requests get a 429 response
    if (!result.success && result.rateLimited) {
      return NextResponse.json({ error: result.error }, { status: 429 })
    }

    // All other cases return 200 with vague success message
    // to prevent email enumeration
    return NextResponse.json({
      success: true,
      message: 'If this email is registered, a login link has been sent.',
    })
  } catch (error) {
    console.error('Magic link request route error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
