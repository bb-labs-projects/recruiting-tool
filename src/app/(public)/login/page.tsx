import type { Metadata } from 'next'
import { MagicLinkForm } from '@/components/auth/magic-link-form'

export const metadata: Metadata = {
  title: 'Sign In',
}

/**
 * Login page -- renders the magic link email form.
 * This is a server component; MagicLinkForm is the client component within it.
 * Renders within the centered public layout.
 */
export default function LoginPage() {
  return <MagicLinkForm />
}
