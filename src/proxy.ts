import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const publicRoutes = ['/login', '/auth/verify', '/auth/mfa-challenge']

function getDashboardPath(role: string): string {
  switch (role) {
    case 'admin':
      return '/admin'
    case 'employer':
      return '/employer'
    case 'candidate':
      return '/candidate'
    default:
      return '/login'
  }
}

/**
 * Decrypt session JWT directly using jose.
 * Self-contained — no imports from session.ts to avoid Edge Runtime issues.
 */
async function decryptSession(cookie: string | undefined) {
  if (!cookie) return null

  const secret =
    process.env.SESSION_SECRET ||
    (process.env.NODE_ENV !== 'production' || process.env.PREVIEW_MODE === 'true'
      ? 'dev-preview-secret-not-for-production-use'
      : undefined)
  if (!secret) {
    console.error('[proxy] SESSION_SECRET env var is not set')
    return null
  }

  try {
    const key = new TextEncoder().encode(secret)
    const { payload } = await jwtVerify(cookie, key, { algorithms: ['HS256'] })
    return {
      sessionId: payload.sessionId as string,
      userId: payload.userId as string,
      role: payload.role as string,
      mfaVerified: payload.mfaVerified !== undefined ? (payload.mfaVerified as boolean) : true,
    }
  } catch {
    return null
  }
}

/**
 * Proxy-based route protection (Next.js 16).
 *
 * Optimistic cookie check only (fast, no database calls).
 * The DAL handles secure database verification in server components.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isPublicRoute = publicRoutes.includes(pathname)

  const cookie = request.cookies.get('session')?.value
  const session = await decryptSession(cookie)

  console.log(`[proxy] ${pathname} | cookie=${!!cookie} | session=${!!session} | role=${session?.role ?? 'none'}`)

  // Unauthenticated user on protected route -> redirect to login
  if (!isPublicRoute && !session) {
    return NextResponse.redirect(new URL('/login', request.nextUrl))
  }

  // MFA check: if user has MFA but hasn't verified, redirect to challenge
  // This must run before the "authenticated user on public route" redirect,
  // otherwise users with pending MFA get bounced away from /auth/mfa-challenge.
  if (session && session.mfaVerified === false) {
    const isMfaPath = pathname.startsWith('/auth/mfa-challenge')
    const isApiPath = pathname.startsWith('/api')
    const isLogoutPath = pathname === '/logout'
    if (!isMfaPath && !isApiPath && !isLogoutPath) {
      return NextResponse.redirect(new URL('/auth/mfa-challenge', request.nextUrl))
    }
    // If on MFA path, let them through
    return NextResponse.next()
  }

  // Authenticated user on public route -> redirect to role-based dashboard
  if (isPublicRoute && session) {
    const dashboardPath = getDashboardPath(session.role)
    console.log(`[proxy] Redirecting authenticated user from ${pathname} to ${dashboardPath}`)
    return NextResponse.redirect(new URL(dashboardPath, request.nextUrl))
  }

  // Role-based route protection for authenticated users
  if (session) {
    if (pathname.startsWith('/admin') && session.role !== 'admin') {
      return NextResponse.redirect(
        new URL(getDashboardPath(session.role), request.nextUrl)
      )
    }

    if (
      pathname.startsWith('/employer') &&
      session.role !== 'employer' &&
      session.role !== 'admin'
    ) {
      return NextResponse.redirect(
        new URL(getDashboardPath(session.role), request.nextUrl)
      )
    }

    if (
      pathname.startsWith('/candidate') &&
      session.role !== 'candidate' &&
      session.role !== 'admin'
    ) {
      return NextResponse.redirect(
        new URL(getDashboardPath(session.role), request.nextUrl)
      )
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
