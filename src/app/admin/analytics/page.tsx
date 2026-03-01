import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getUser } from '@/lib/dal'
import {
  getAnalyticsSummary,
  getTopProfiles,
  getRecentUnlocks,
} from '@/lib/dal/admin-analytics'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { DollarSign, Unlock, Eye, TrendingUp } from 'lucide-react'

/**
 * Admin analytics dashboard page.
 * Displays platform-wide metrics: revenue, unlocks, views, conversion rate,
 * most viewed profiles, and recent unlock transactions.
 *
 * Defense-in-depth: checks admin role even though admin/layout.tsx also checks.
 */
export default async function AdminAnalyticsPage() {
  const user = await getUser()

  if (!user || user.role !== 'admin') {
    redirect('/login')
  }

  const [summary, topProfiles, recentUnlocks] = await Promise.all([
    getAnalyticsSummary(),
    getTopProfiles(10),
    getRecentUnlocks(10),
  ])

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight font-sans">Analytics</h1>
        <p className="text-muted-foreground">
          Platform metrics and activity overview
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-sans">
              ${(summary.totalRevenue / 100).toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">
              From profile unlocks
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Unlocks
            </CardTitle>
            <Unlock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-sans">{summary.totalUnlocks}</p>
            <p className="text-xs text-muted-foreground">
              Profiles purchased by employers
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Profile Views
            </CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-sans">{summary.totalViews}</p>
            <p className="text-xs text-muted-foreground">
              Total profile detail views
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Conversion Rate
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-sans">{summary.conversionRate}%</p>
            <p className="text-xs text-muted-foreground">
              Views to unlocks
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Two-column layout: Top Profiles + Recent Unlocks */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {/* Most Viewed Profiles */}
        <Card className="rounded-xl shadow-sm overflow-hidden">
          <CardHeader>
            <CardTitle>Most Viewed Profiles</CardTitle>
            <CardDescription>
              Active profiles with the highest view counts
            </CardDescription>
          </CardHeader>
          <CardContent>
            {topProfiles.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No profile views recorded yet
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Specializations</TableHead>
                    <TableHead className="text-right">Views</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topProfiles.map((profile) => (
                    <TableRow key={profile.profileId} className="even:bg-muted/30 hover:bg-accent/40">
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {profile.specializations.length > 0 ? (
                            profile.specializations.map((spec) => (
                              <Badge
                                key={spec}
                                variant="secondary"
                              >
                                {spec}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              No specializations
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {profile.viewCount}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/admin/candidates/${profile.profileId}`}
                          className="text-sm text-primary underline-offset-4 hover:underline"
                        >
                          View
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Recent Unlocks */}
        <Card className="rounded-xl shadow-sm overflow-hidden">
          <CardHeader>
            <CardTitle>Recent Unlocks</CardTitle>
            <CardDescription>
              Latest profile unlock transactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentUnlocks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No profile unlocks yet
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employer</TableHead>
                    <TableHead>Specializations</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentUnlocks.map((unlock) => (
                    <TableRow key={`${unlock.profileId}-${unlock.employerEmail}`} className="even:bg-muted/30 hover:bg-accent/40">
                      <TableCell className="text-sm">
                        {unlock.employerEmail}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {unlock.specializations.length > 0 ? (
                            unlock.specializations.map((spec) => (
                              <Badge
                                key={spec}
                                variant="secondary"
                              >
                                {spec}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              --
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${(unlock.amountPaid / 100).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {unlock.unlockedAt.toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
