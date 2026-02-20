import { getUser } from '@/lib/dal'
import { getEmployerProfile } from '@/lib/dal/admin-employers'
import { getJobsByEmployer } from '@/lib/dal/jobs'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Plus, Briefcase } from 'lucide-react'
import { PublishButton } from './publish-button'

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  open: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  closed: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  archived: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
}

export default async function EmployerJobsPage() {
  const user = await getUser()
  if (!user) redirect('/login')
  const employerProfile = await getEmployerProfile(user.id)
  if (!employerProfile || employerProfile.status !== 'approved') {
    redirect('/employer')
  }

  const jobs = await getJobsByEmployer(user.id)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Jobs</h1>
          <p className="text-muted-foreground mt-1">
            Manage your job listings and view matched candidates
          </p>
        </div>
        <Button asChild>
          <Link href="/employer/jobs/new">
            <Plus className="mr-2 size-4" />
            Create Job
          </Link>
        </Button>
      </div>

      {jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <Briefcase className="text-muted-foreground mb-4 size-12" />
          <h3 className="text-lg font-semibold">No job listings yet</h3>
          <p className="text-muted-foreground mt-1 max-w-md text-center text-sm">
            You haven&apos;t created any job listings yet. Create your first job
            to start matching with qualified candidates.
          </p>
          <Button asChild className="mt-4">
            <Link href="/employer/jobs/new">
              <Plus className="mr-2 size-4" />
              Create Job
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <Card key={job.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-4">
                  <div>
                    <Link
                      href={`/employer/jobs/${job.id}`}
                      className="text-base font-medium hover:underline"
                    >
                      {job.title}
                    </Link>
                    <div className="text-muted-foreground mt-1 flex items-center gap-3 text-sm">
                      <span>
                        Created{' '}
                        {job.createdAt.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                      {job.matchCount > 0 && (
                        <span>
                          {job.matchCount} match
                          {job.matchCount !== 1 ? 'es' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={statusColors[job.status] ?? ''}>
                    {job.status}
                  </Badge>
                  {job.status === 'draft' && (
                    <PublishButton jobId={job.id} />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
