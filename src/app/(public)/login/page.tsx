import type { Metadata } from 'next'
import { MagicLinkForm } from '@/components/auth/magic-link-form'

export const metadata: Metadata = {
  title: 'Sign In',
}

/**
 * Login page -- renders the magic link email form.
 * Middleware handles redirecting authenticated users to their dashboard.
 */
export default function LoginPage() {
  return <MagicLinkForm />
}
