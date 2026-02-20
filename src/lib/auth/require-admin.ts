import 'server-only'

import { cookies } from 'next/headers'
import { decrypt } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { users, sessions } from '@/lib/db/schema'
import { eq, and, gt } from 'drizzle-orm'
import { AUTH_CONSTANTS } from '@/lib/auth/constants'

export async function requireAdmin(): Promise<{ userId: string }> {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(AUTH_CONSTANTS.SESSION_COOKIE_NAME)?.value
  const payload = await decrypt(sessionCookie)

  if (!payload?.sessionId) {
    throw new Error('Unauthorized')
  }

  const [session] = await db
    .select({ userId: sessions.userId })
    .from(sessions)
    .where(and(eq(sessions.id, payload.sessionId), gt(sessions.expiresAt, new Date())))
    .limit(1)

  if (!session) {
    throw new Error('Unauthorized')
  }

  const [user] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1)

  if (!user || user.role !== 'admin') {
    throw new Error('Forbidden')
  }

  return { userId: user.id }
}
