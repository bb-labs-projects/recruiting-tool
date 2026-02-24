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
import { Clock } from 'lucide-react'

/**
 * Pending approval status page.
 * Shows when an employer has registered but not yet been approved by admin.
 * Redirects to register if no profile, or to dashboard if not pending.
 */
export default async function EmployerPendingPage() {
  const user = await getUser()

  if (!user) {
    redirect('/login')
  }

  const profile = await getEmployerProfile(user.id)

  if (!profile) {
    redirect('/employer/register')
  }

  if (profile.status !== 'pending') {
    redirect('/employer')
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-md rounded-xl shadow-sm text-center">
        <CardHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-900/30">
            <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <CardTitle className="font-[family-name:var(--font-outfit)]">Account Pending Approval</CardTitle>
          <CardDescription>
            {profile.companyName}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Your account is being reviewed by our team. You will be able to
            browse candidate profiles once approved.
          </p>
          <p className="text-xs text-muted-foreground">
            We will notify you by email when your account is reviewed.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
