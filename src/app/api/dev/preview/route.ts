import { NextRequest, NextResponse } from 'next/server'
import { SignJWT } from 'jose'
import { AUTH_CONSTANTS } from '@/lib/auth/constants'

/**
 * GET /api/dev/preview?role=admin|employer|candidate
 *
 * Development-only route that creates a mock session cookie and redirects
 * to the appropriate dashboard. This lets you preview all pages without
 * needing a database, email service, or auth provider.
 *
 * The session JWT includes a `devPreview: true` claim that the DAL
 * recognises -- it returns a synthetic user instead of querying the DB.
 *
 * Returns 404 in production.
 */

const VALID_ROLES = ['admin', 'employer', 'candidate'] as const
type Role = (typeof VALID_ROLES)[number]

const ROLE_REDIRECTS: Record<Role, string> = {
  admin: '/admin',
  employer: '/employer',
  candidate: '/candidate',
}

const DEV_USER_IDS: Record<Role, string> = {
  admin: '00000000-0000-0000-0000-000000000001',
  employer: '00000000-0000-0000-0000-000000000002',
  candidate: '00000000-0000-0000-0000-000000000003',
}

const DEV_SESSION_ID = '00000000-0000-0000-0000-d00000000001'

export async function GET(request: NextRequest) {
  // Block in production unless PREVIEW_MODE is explicitly enabled.
  if (process.env.NODE_ENV === 'production' && process.env.PREVIEW_MODE !== 'true') {
    return new NextResponse('Not Found', { status: 404 })
  }

  // Determine the secret key. Fall back to a dev-only default so the
  // route works even when SESSION_SECRET is absent from the environment.
  const secret =
    process.env.SESSION_SECRET || 'dev-preview-secret-not-for-production-use'
  const encodedKey = new TextEncoder().encode(secret)

  // Parse and validate the role query parameter.
  const { searchParams } = new URL(request.url)
  const roleParam = searchParams.get('role') ?? 'employer'
  const role: Role = VALID_ROLES.includes(roleParam as Role)
    ? (roleParam as Role)
    : 'employer'

  const expiresAt = new Date(
    Date.now() + AUTH_CONSTANTS.SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000
  )

  // Build a JWT that matches the shape the DAL's decrypt() expects,
  // with the extra `devPreview` flag.
  const token = await new SignJWT({
    sessionId: DEV_SESSION_ID,
    userId: DEV_USER_IDS[role],
    role,
    expiresAt: expiresAt.toISOString(),
    mfaVerified: true,
    devPreview: true,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${AUTH_CONSTANTS.SESSION_EXPIRY_DAYS}d`)
    .sign(encodedKey)

  // Build the redirect response and attach the session cookie.
  const redirectUrl = new URL(ROLE_REDIRECTS[role], request.url)
  const response = NextResponse.redirect(redirectUrl)

  response.cookies.set(AUTH_CONSTANTS.SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: false, // dev only -- no HTTPS required
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  })

  return response
}
