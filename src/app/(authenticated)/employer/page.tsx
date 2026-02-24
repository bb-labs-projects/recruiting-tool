import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getUser } from '@/lib/dal'
import { getEmployerProfile } from '@/lib/dal/admin-employers'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Search, Bookmark, Briefcase } from 'lucide-react'

/**
 * Employer dashboard page.
 * Checks employer profile status and redirects to the appropriate
 * status page if the employer is not yet approved.
 *
 * Approved employers see a dashboard with feature cards.
 */
export default async function EmployerDashboardPage() {
  const user = await getUser()

  if (!user) {
    redirect('/login')
  }

  const profile = await getEmployerProfile(user.id)

  if (!profile) {
    redirect('/employer/register')
  }

  if (profile.status === 'pending') {
    redirect('/employer/pending')
  }

  if (profile.status === 'rejected') {
    redirect('/employer/rejected')
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-outfit)] text-2xl font-bold tracking-tight">
          Employer Dashboard
        </h1>
        <p className="text-muted-foreground">
          Welcome back, {profile.companyName}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/employer/browse" className="block">
          <Card className="h-full rounded-xl shadow-sm transition-shadow hover:shadow-md">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Search className="h-5 w-5 text-teal-600" />
                <CardTitle>Browse Candidates</CardTitle>
              </div>
              <CardDescription>
                Search and discover IP lawyer profiles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Find qualified candidates matching your requirements.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/employer/saved" className="block">
          <Card className="h-full rounded-xl shadow-sm transition-shadow hover:shadow-md">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bookmark className="h-5 w-5 text-teal-600" />
                <CardTitle>Saved Profiles</CardTitle>
              </div>
              <CardDescription>
                View your shortlisted candidates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Review profiles you&apos;ve saved for later.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Card className="rounded-xl shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-teal-600" />
              <CardTitle>My Jobs</CardTitle>
            </div>
            <CardDescription>
              Manage your posted job listings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Coming soon.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
