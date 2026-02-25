'use server'

import { z } from 'zod'
import { handleMagicLinkRequest } from '@/lib/auth/request-magic-link'
import { verifyTurnstileToken } from '@/lib/turnstile'

export type MagicLinkState =
  | {
      success?: boolean
      error?: string
    }
  | undefined

const RequestMagicLinkSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  role: z.enum(['candidate', 'employer']).optional().default('candidate'),
})

/**
 * Server action for the magic link login form.
 *
 * Compatible with React useActionState:
 *   const [state, action, pending] = useActionState(requestMagicLink, undefined)
 *
 * Delegates to handleMagicLinkRequest for the actual logic, sharing
 * implementation with the API route (no business logic duplication).
 */
export async function requestMagicLink(
  prevState: MagicLinkState,
  formData: FormData
): Promise<MagicLinkState> {
  try {
    const rawEmail = formData.get('email')

    const rawRole = formData.get('role')

    const parsed = RequestMagicLinkSchema.safeParse({ email: rawEmail, role: rawRole })

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors
      return { error: fieldErrors.email?.[0] ?? 'Invalid email address' }
    }

    const turnstileToken = formData.get('turnstileToken') as string | null
    const turnstileValid = await verifyTurnstileToken(turnstileToken)
    if (!turnstileValid) {
      return { error: 'Bot verification failed. Please try again.' }
    }

    // Server actions don't have easy access to request headers.
    // Use 'server-action' as placeholder -- the security log still
    // records the event, just without client IP.
    const result = await handleMagicLinkRequest({
      email: parsed.data.email,
      ip: 'server-action',
      userAgent: 'server-action',
      role: parsed.data.role,
    })

    if (!result.success && result.rateLimited) {
      return { error: 'Too many login attempts. Please try again later.' }
    }

    if (!result.success) {
      return { error: result.error }
    }

    return { success: true }
  } catch (error) {
    console.error('requestMagicLink server action error:', error)
    return { error: 'Something went wrong. Please try again.' }
  }
}
