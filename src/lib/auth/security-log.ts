export type SecurityEventType =
  | 'magic_link_requested'
  | 'magic_link_verified'
  | 'magic_link_expired'
  | 'magic_link_invalid'
  | 'session_created'
  | 'session_expired'
  | 'logout'

export interface SecurityEvent {
  event: SecurityEventType
  userId: string | null
  email: string
  ip: string
  userAgent: string
  timestamp: string // ISO8601
  success: boolean
  failureReason?: string
}

/**
 * Log a structured security event.
 *
 * Uses console.log with JSON output so events are captured by
 * Vercel Logs (or any log aggregation tool) in production.
 * The `_type` field enables filtering security events from
 * regular application logs.
 */
export function logSecurityEvent(event: SecurityEvent): void {
  console.log(JSON.stringify({ ...event, _type: 'security_event' }))
}

/**
 * Extract IP address and user agent from a request.
 * Avoids duplicating header extraction logic in every route handler.
 */
export function buildSecurityContext(request: Request): {
  ip: string
  userAgent: string
} {
  const headers = request.headers

  const forwardedFor = headers.get('x-forwarded-for')
  const ip =
    (forwardedFor ? forwardedFor.split(',')[0].trim() : null) ??
    headers.get('x-real-ip') ??
    'unknown'

  const userAgent = headers.get('user-agent') ?? 'unknown'

  return { ip, userAgent }
}
