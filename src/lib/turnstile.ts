import 'server-only'

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

/**
 * Verify a Cloudflare Turnstile token server-side.
 * Returns true on success. Gracefully degrades (returns true) when env vars are missing.
 */
export async function verifyTurnstileToken(token: string | null): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY

  // Graceful degradation: if no secret key configured, allow through
  if (!secretKey) {
    console.warn('[turnstile] TURNSTILE_SECRET_KEY not set, skipping verification')
    return true
  }

  if (!token) {
    return false
  }

  try {
    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
      }),
    })

    const data = await response.json()
    return data.success === true
  } catch (error) {
    console.error('[turnstile] Verification error:', error)
    // Fail open on network errors to avoid blocking users
    return true
  }
}
