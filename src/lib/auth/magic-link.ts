import 'server-only'

import { randomBytes, createHash } from 'crypto'
import { AUTH_CONSTANTS } from './constants'

/**
 * Generate a cryptographically random token and its SHA-256 hash.
 * The raw token is sent to the user via email; only the hash is stored in the database.
 */
export function generateToken(): { token: string; tokenHash: string } {
  const token = randomBytes(AUTH_CONSTANTS.TOKEN_BYTE_LENGTH).toString('hex')
  const tokenHash = hashToken(token)
  return { token, tokenHash }
}

/**
 * Hash a token using SHA-256.
 * Used to verify a token from a magic link against the stored hash.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}
