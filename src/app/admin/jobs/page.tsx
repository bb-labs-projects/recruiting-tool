import Link from 'next/link'
import { getJobsForAdmin } from '@/lib/dal/jobs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { columns, type JobRow } from './columns'
import { DataTable } from './data-table'

export default async function AdminJobsPage() {
  const allJobs = await getJobsForAdmin()

  const jobRows: JobRow[] = allJobs.map((job) => ({
    id: job.id,
    title: job.title,
    status: job.status,
    matchingStatus: job.matchingStatus,
    employerCompanyName: job.employerCompanyName,
    matchCount: job.matchCount,
    createdAt: job.createdAt.toISOString(),
  }))

  const totalCount = jobRows.length
  const draftCount = jobRows.filter((r) => r.status === 'draft').length
  const openCount = jobRows.filter((r) => r.status === 'open').length
  const closedCount = jobRows.filter(
    (r) => r.status === 'closed' || r.status === 'archived'
  ).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-sans">Job Listings</h1>
          <p className="text-muted-foreground">
            Manage job listings across all employers
          </p>
        </div>
        <Button asChild className="rounded-lg transition-all">
          <Link href="/admin/jobs/new">Create Job</Link>
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-sans">{totalCount}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Draft
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-sans text-amber-600">{draftCount}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Open
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-sans text-teal-600">{openCount}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Closed / Archived
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-sans text-stone-600">{closedCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Data table */}
      <DataTable columns={columns} data={jobRows} />
    </div>
  )
}
