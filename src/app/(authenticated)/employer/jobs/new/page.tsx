import { getUser } from '@/lib/dal'
import { getEmployerProfile } from '@/lib/dal/admin-employers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createJobAction } from '@/actions/jobs'
import { JobForm } from '@/components/jobs/job-form'
import { ArrowLeft } from 'lucide-react'

export default async function NewJobPage() {
  const user = await getUser()
  if (!user) redirect('/login')
  const employerProfile = await getEmployerProfile(user.id)
  if (!employerProfile || employerProfile.status !== 'approved') {
    redirect('/employer')
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/employer/jobs"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back to Jobs
      </Link>

      <div>
        <h1 className="font-[family-name:var(--font-outfit)] text-2xl font-bold tracking-tight">
          Create Job Listing
        </h1>
        <p className="text-muted-foreground mt-1">
          Define your job requirements to find matching candidates
        </p>
      </div>

      <JobForm mode="create" action={createJobAction} />
    </div>
  )
}
