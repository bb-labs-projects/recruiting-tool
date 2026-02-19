import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { decrypt } from '@/lib/auth/session'
import { AUTH_CONSTANTS } from '@/lib/auth/constants'

const publicRoutes = ['/login', '/auth/verify']

/**
 * Get the role-based dashboard path for a user.
 */
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
 * Proxy-based route protection (Next.js 16 convention).
 *
 * This is the first layer of defense-in-depth:
 * - Optimistic cookie check only (fast, no database calls)
 * - The DAL (Data Access Layer) handles secure database verification
 *   in server components and server actions
 *
 * IMPORTANT: This function does NOT make database calls. It only reads
 * and decrypts the cookie. This keeps it fast since the proxy runs on
 * every matched route including prefetches.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isPublicRoute = publicRoutes.includes(pathname)

  // Decrypt session cookie (fast, no DB call)
  const cookie = request.cookies.get(AUTH_CONSTANTS.SESSION_COOKIE_NAME)?.value
  const session = await decrypt(cookie)

  // Unauthenticated user on protected route -> redirect to login
  if (!isPublicRoute && !session) {
    return NextResponse.redirect(new URL('/login', request.nextUrl))
  }

  // Authenticated user on public route -> redirect to role-based dashboard
  if (isPublicRoute && session) {
    const dashboardPath = getDashboardPath(session.role)
    return NextResponse.redirect(new URL(dashboardPath, request.nextUrl))
  }

  // Role-based route protection for authenticated users
  if (session) {
    // Admin routes: only admin can access
    if (pathname.startsWith('/admin') && session.role !== 'admin') {
      const dashboardPath = getDashboardPath(session.role)
      return NextResponse.redirect(new URL(dashboardPath, request.nextUrl))
    }

    // Employer routes: only employer and admin can access
    if (
      pathname.startsWith('/employer') &&
      session.role !== 'employer' &&
      session.role !== 'admin'
    ) {
      const dashboardPath = getDashboardPath(session.role)
      return NextResponse.redirect(new URL(dashboardPath, request.nextUrl))
    }

    // Candidate routes: only candidate and admin can access
    if (
      pathname.startsWith('/candidate') &&
      session.role !== 'candidate' &&
      session.role !== 'admin'
    ) {
      const dashboardPath = getDashboardPath(session.role)
      return NextResponse.redirect(new URL(dashboardPath, request.nextUrl))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
