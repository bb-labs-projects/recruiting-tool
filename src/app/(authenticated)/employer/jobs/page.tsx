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
  draft: 'bg-amber-50 text-amber-700 border border-amber-200',
  open: 'bg-teal-50 text-teal-700 border border-teal-200',
  closed: 'bg-red-50 text-red-700 border border-red-200',
  archived: 'bg-stone-100 text-stone-600 border border-stone-200',
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
          <h1 className="font-[family-name:var(--font-outfit)] text-2xl font-bold tracking-tight">My Jobs</h1>
          <p className="text-muted-foreground mt-1">
            Manage your job listings and view matched candidates
          </p>
        </div>
        <Button asChild className="rounded-lg transition-all">
          <Link href="/employer/jobs/new">
            <Plus className="mr-2 size-4" />
            Create Job
          </Link>
        </Button>
      </div>

      {jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl py-20">
          <Briefcase className="text-teal-400 mb-4 size-12" />
          <h3 className="font-[family-name:var(--font-outfit)] text-lg font-semibold">No job listings yet</h3>
          <p className="text-muted-foreground mt-1 max-w-md text-center text-sm">
            You haven&apos;t created any job listings yet. Create your first job
            to start matching with qualified candidates.
          </p>
          <Button asChild className="mt-4 rounded-lg transition-all">
            <Link href="/employer/jobs/new">
              <Plus className="mr-2 size-4" />
              Create Job
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <Card key={job.id} className="rounded-xl shadow-sm">
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
