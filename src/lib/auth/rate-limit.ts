import 'server-only'

import { db } from '@/lib/db'
import { magicLinkTokens } from '@/lib/db/schema'
import { sql, count, and, gte, eq } from 'drizzle-orm'
import { AUTH_CONSTANTS } from './constants'

/**
 * Check if a user has exceeded the magic link request rate limit.
 * Uses database-backed counting (not in-memory) because Vercel serverless
 * functions are ephemeral and in-memory state is lost on cold start.
 */
export async function checkRateLimit(
  userId: string
): Promise<{ allowed: boolean; remaining: number }> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

  const result = await db
    .select({ tokenCount: count() })
    .from(magicLinkTokens)
    .where(
      and(
        eq(magicLinkTokens.userId, userId),
        gte(magicLinkTokens.createdAt, oneHourAgo)
      )
    )

  const tokenCount = result[0]?.tokenCount ?? 0
  const limit = AUTH_CONSTANTS.MAGIC_LINK_RATE_LIMIT_PER_HOUR

  return {
    allowed: tokenCount < limit,
    remaining: Math.max(0, limit - tokenCount),
  }
}
