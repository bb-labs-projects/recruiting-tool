import { getUser } from '@/lib/dal'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

/**
 * Employer dashboard page.
 * Fetches user data from the DAL and renders a dashboard skeleton
 * with placeholder cards for key features.
 */
export default async function EmployerDashboardPage() {
  const user = await getUser()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">
          Employer Dashboard
        </h1>
        <p className="text-muted-foreground">
          Welcome back, {user?.email}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Browse Candidates</CardTitle>
            <CardDescription>
              Search and discover IP lawyer profiles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Candidate browsing coming soon.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Saved Profiles</CardTitle>
            <CardDescription>
              View your shortlisted candidates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Saved profiles coming soon.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>My Jobs</CardTitle>
            <CardDescription>
              Manage your posted job listings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Job management coming soon.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
