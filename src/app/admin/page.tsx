import { redirect } from 'next/navigation'
import { getUser } from '@/lib/dal'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

/**
 * Admin dashboard page.
 * Defense-in-depth: checks admin role even though admin/layout.tsx also checks.
 * Layouts don't re-render on client-side navigation, so the page-level check
 * is the security boundary.
 */
export default async function AdminDashboardPage() {
  const user = await getUser()

  if (!user || user.role !== 'admin') {
    redirect('/login')
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">
          Admin Dashboard
        </h1>
        <p className="text-muted-foreground">
          Welcome back, {user.email}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Candidates</CardTitle>
            <CardDescription>
              Total registered candidates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">--</p>
            <p className="text-sm text-muted-foreground">
              Data available after database is connected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Employers</CardTitle>
            <CardDescription>
              Total registered employers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">--</p>
            <p className="text-sm text-muted-foreground">
              Data available after database is connected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue</CardTitle>
            <CardDescription>
              Total platform revenue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">--</p>
            <p className="text-sm text-muted-foreground">
              Stripe integration coming in Phase 6
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
