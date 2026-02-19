import type { Metadata } from 'next'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export const metadata: Metadata = {
  title: 'Sign In',
}

/**
 * Login page -- placeholder for the magic link form.
 * The actual MagicLinkForm component will be implemented in Plan 05.
 * Renders within the centered public layout.
 */
export default function LoginPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign In</CardTitle>
        <CardDescription>
          Enter your email to receive a magic link
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Magic link form will be implemented here.
        </p>
      </CardContent>
    </Card>
  )
}
