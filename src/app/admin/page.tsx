import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getUser } from '@/lib/dal'
import { db } from '@/lib/db'
import { profiles, employerProfiles, profileUnlocks } from '@/lib/db/schema'
import { count, sum, eq } from 'drizzle-orm'
import { ArrowRight } from 'lucide-react'

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
      <h1 className="font-sans text-2xl font-semibold mb-6">Dashboard</h1>

      {/* Metric row - inline with vertical dividers */}
      <div className="flex items-center gap-8 pb-4 border-b border-border">
        <div>
          <p className="font-mono text-lg font-semibold">{activeCandidates}</p>
          <p className="text-xs text-muted-foreground">Candidates</p>
        </div>
        <div className="h-8 w-px bg-border" />
        <div>
          <p className="font-mono text-lg font-semibold">{approvedEmployers}</p>
          <p className="text-xs text-muted-foreground">Employers</p>
        </div>
        <div className="h-8 w-px bg-border" />
        <div>
          <p className="font-mono text-lg font-semibold">
            ${(totalRevenue / 100).toFixed(2)}
          </p>
          <p className="text-xs text-muted-foreground">Revenue</p>
        </div>
      </div>

      {/* Quick links */}
      <div className="mt-6 flex flex-col gap-3">
        <Link
          href="/admin/analytics"
          className="flex items-center justify-between text-sm text-brand hover:underline underline-offset-4"
        >
          View Analytics
          <ArrowRight className="size-3" />
        </Link>
        <Link
          href="/admin/candidates"
          className="flex items-center justify-between text-sm text-brand hover:underline underline-offset-4"
        >
          Manage Candidates
          <ArrowRight className="size-3" />
        </Link>
        <Link
          href="/admin/employers"
          className="flex items-center justify-between text-sm text-brand hover:underline underline-offset-4"
        >
          Manage Employers
          <ArrowRight className="size-3" />
        </Link>
        <Link
          href="/admin/users"
          className="flex items-center justify-between text-sm text-brand hover:underline underline-offset-4"
        >
          Manage Users
          <ArrowRight className="size-3" />
        </Link>
      </div>
    </div>
  )
}
