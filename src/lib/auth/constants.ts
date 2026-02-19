export const AUTH_CONSTANTS = {
  /** Magic link token expiry in minutes */
  MAGIC_LINK_EXPIRY_MINUTES: 10,

  /** Maximum magic link requests per email per hour */
  MAGIC_LINK_RATE_LIMIT_PER_HOUR: 5,

  /** Session expiry in days */
  SESSION_EXPIRY_DAYS: 7,

  /** Name of the session cookie */
  SESSION_COOKIE_NAME: 'session',

  /** Number of random bytes for token generation */
  TOKEN_BYTE_LENGTH: 32,
} as const
