import 'server-only'

import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { AUTH_CONSTANTS } from './constants'

export interface SessionPayload {
  sessionId: string
  userId: string
  role: string
  expiresAt: Date
  mfaVerified: boolean
  /** When true, the DAL skips database lookups and returns a mock user. Dev only. */
  devPreview?: boolean
}

const sessionSecret =
  process.env.SESSION_SECRET ||
  (process.env.NODE_ENV !== 'production' || process.env.PREVIEW_MODE === 'true'
    ? 'dev-preview-secret-not-for-production-use'
    : undefined)

const encodedKey = new TextEncoder().encode(sessionSecret)

export async function encrypt(payload: SessionPayload): Promise<string> {
  return new SignJWT({
    sessionId: payload.sessionId,
    userId: payload.userId,
    role: payload.role,
    expiresAt: payload.expiresAt.toISOString(),
    mfaVerified: payload.mfaVerified,
    ...(payload.devPreview ? { devPreview: true } : {}),
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${AUTH_CONSTANTS.SESSION_EXPIRY_DAYS}d`)
    .sign(encodedKey)
}

export async function decrypt(
  session: string | undefined
): Promise<SessionPayload | null> {
  if (!session) return null

  try {
    const { payload } = await jwtVerify(session, encodedKey, {
      algorithms: ['HS256'],
    })

    return {
      sessionId: payload.sessionId as string,
      userId: payload.userId as string,
      role: payload.role as string,
      expiresAt: new Date(payload.expiresAt as string),
      mfaVerified: payload.mfaVerified !== undefined ? (payload.mfaVerified as boolean) : true,
      devPreview: payload.devPreview === true,
    }
  } catch {
    return null
  }
}

export async function createSession(
  sessionId: string,
  userId: string,
  role: string,
  mfaVerified: boolean = true
): Promise<void> {
  const expiresAt = new Date(
    Date.now() + AUTH_CONSTANTS.SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000
  )

  const session = await encrypt({ sessionId, userId, role, expiresAt, mfaVerified })

  const cookieStore = await cookies()
  cookieStore.set(AUTH_CONSTANTS.SESSION_COOKIE_NAME, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  })
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(AUTH_CONSTANTS.SESSION_COOKIE_NAME)
}
