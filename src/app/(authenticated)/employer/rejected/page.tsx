import { redirect } from 'next/navigation'
import { getUser } from '@/lib/dal'
import { getEmployerProfile } from '@/lib/dal/admin-employers'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { XCircle } from 'lucide-react'

/**
 * Rejected employer page.
 * Shows when an employer's registration has been rejected by admin.
 * Displays the rejection reason if provided.
 * Redirects to register if no profile, or to dashboard if not rejected.
 */
export default async function EmployerRejectedPage() {
  const user = await getUser()

  if (!user) {
    redirect('/login')
  }

  const profile = await getEmployerProfile(user.id)

  if (!profile) {
    redirect('/employer/register')
  }

  if (profile.status !== 'rejected') {
    redirect('/employer')
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-md rounded-xl shadow-sm text-center">
        <CardHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/30">
            <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="font-[family-name:var(--font-outfit)]">Account Not Approved</CardTitle>
          <CardDescription>
            {profile.companyName}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {profile.rejectionReason && (
            <div className="rounded-md bg-muted p-3 text-left">
              <p className="text-sm font-medium">Reason</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {profile.rejectionReason}
              </p>
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            If you believe this was a mistake, please contact us.
          </p>
          <a
            href="mailto:support@example.com"
            className="inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Contact Support
          </a>
        </CardContent>
      </Card>
    </div>
  )
}
