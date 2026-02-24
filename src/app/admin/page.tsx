import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getUser } from '@/lib/dal'
import { db } from '@/lib/db'
import { profiles, employerProfiles, profileUnlocks } from '@/lib/db/schema'
import { count, sum, eq } from 'drizzle-orm'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Users,
  Building2,
  DollarSign,
  ArrowRight,
} from 'lucide-react'

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

  // Live database queries
  const [candidatesRow] = await db
    .select({ count: count() })
    .from(profiles)
    .where(eq(profiles.status, 'active'))

  const [employersRow] = await db
    .select({ count: count() })
    .from(employerProfiles)
    .where(eq(employerProfiles.status, 'approved'))

  const [revenueRow] = await db
    .select({ total: sum(profileUnlocks.amountPaid) })
    .from(profileUnlocks)

  const activeCandidates = candidatesRow?.count ?? 0
  const approvedEmployers = employersRow?.count ?? 0
  const totalRevenue = revenueRow?.total ? Number(revenueRow.total) : 0

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight font-[family-name:var(--font-outfit)]">
          Admin Dashboard
        </h1>
        <p className="text-muted-foreground">
          Welcome back, {user.email}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Candidates</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold font-[family-name:var(--font-outfit)]">{activeCandidates}</p>
            <p className="text-sm text-muted-foreground">
              Active candidate profiles
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Employers</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold font-[family-name:var(--font-outfit)]">{approvedEmployers}</p>
            <p className="text-sm text-muted-foreground">
              Approved employer accounts
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold font-[family-name:var(--font-outfit)]">
              ${(totalRevenue / 100).toFixed(2)}
            </p>
            <p className="text-sm text-muted-foreground">
              Total from profile unlocks
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quick Links</CardTitle>
          </CardHeader>
          <CardContent>
            <nav className="flex flex-col gap-2">
              <Link
                href="/admin/analytics"
                className="flex items-center justify-between text-sm text-primary hover:underline underline-offset-4"
              >
                View Analytics
                <ArrowRight className="h-3 w-3" />
              </Link>
              <Link
                href="/admin/candidates"
                className="flex items-center justify-between text-sm text-primary hover:underline underline-offset-4"
              >
                Manage Candidates
                <ArrowRight className="h-3 w-3" />
              </Link>
              <Link
                href="/admin/employers"
                className="flex items-center justify-between text-sm text-primary hover:underline underline-offset-4"
              >
                Manage Employers
                <ArrowRight className="h-3 w-3" />
              </Link>
              <Link
                href="/admin/users"
                className="flex items-center justify-between text-sm text-primary hover:underline underline-offset-4"
              >
                Manage Users
                <ArrowRight className="h-3 w-3" />
              </Link>
            </nav>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
