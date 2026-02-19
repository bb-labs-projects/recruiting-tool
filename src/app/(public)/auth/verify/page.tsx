import type { Metadata } from 'next'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export const metadata: Metadata = {
  title: 'Verify Login',
}

/**
 * Verify page -- placeholder for the token confirmation UI.
 * The actual verify logic will be implemented in Plan 05.
 * Renders within the centered public layout.
 */
export default function VerifyPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Verify Your Login</CardTitle>
        <CardDescription>
          Confirming your magic link token
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Token verification will be implemented here.
        </p>
      </CardContent>
    </Card>
  )
}
