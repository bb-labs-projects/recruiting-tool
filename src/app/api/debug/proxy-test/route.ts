import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'

/**
 * GET /api/debug/proxy-test — test the exact same jose logic the proxy uses.
 * This helps verify whether SESSION_SECRET is available and jose decryption works
 * with the same approach the proxy takes (no session.ts imports).
 */
export async function GET() {
  const steps: Record<string, unknown> = {}

  try {
    const cookieStore = await cookies()
    const cookie = cookieStore.get('session')?.value
    steps.cookie_exists = !!cookie

    if (!cookie) {
      return NextResponse.json({ ...steps, error: 'No session cookie found' })
    }

    const secret = process.env.SESSION_SECRET
    steps.secret_exists = !!secret
    steps.secret_length = secret?.length ?? 0

    if (!secret) {
      return NextResponse.json({ ...steps, error: 'SESSION_SECRET not set' })
    }

    const key = new TextEncoder().encode(secret)
    const { payload } = await jwtVerify(cookie, key, { algorithms: ['HS256'] })

    steps.jose_decrypt_ok = true
    steps.role = payload.role
    steps.userId = payload.userId
    steps.sessionId = payload.sessionId

    // This is exactly what the proxy would do
    const role = payload.role as string
    const redirectTarget =
      role === 'admin' ? '/admin' :
      role === 'employer' ? '/employer' :
      role === 'candidate' ? '/candidate' :
      '/login'

    steps.proxy_would_redirect_to = redirectTarget

    return NextResponse.json(steps)
  } catch (error) {
    return NextResponse.json({
      ...steps,
      jose_decrypt_ok: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 })
  }
}
