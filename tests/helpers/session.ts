import { SignJWT } from 'jose'
import type { BrowserContext } from '@playwright/test'

const SESSION_SECRET = process.env.SESSION_SECRET ?? 'tY5d1y3GDOrEUITS9qtIYYmcTfGSOCExSGH4lEMeevM='
const encodedKey = new TextEncoder().encode(SESSION_SECRET)

/**
 * Create a valid signed JWT session cookie, identical to the app's encrypt().
 * Lets us test proxy routing behavior without a database.
 */
export async function createSessionJWT(role: string): Promise<string> {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  return new SignJWT({
    sessionId: 'test-session-id',
    userId: 'test-user-id',
    role,
    expiresAt: expiresAt.toISOString(),
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(encodedKey)
}

/**
 * Inject a session cookie into a Playwright browser context.
 */
export async function injectSessionCookie(
  context: BrowserContext,
  role: string
): Promise<void> {
  const jwt = await createSessionJWT(role)
  await context.addCookies([
    {
      name: 'session',
      value: jwt,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Strict',
    },
  ])
}
