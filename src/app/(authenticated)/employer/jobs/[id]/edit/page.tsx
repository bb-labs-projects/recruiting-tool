import { getUser } from '@/lib/dal'
import { getEmployerProfile } from '@/lib/dal/admin-employers'
import { getJobById } from '@/lib/dal/jobs'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { updateJobAction } from '@/actions/jobs'
import { JobForm } from '@/components/jobs/job-form'
import type { JobFormData } from '@/components/jobs/job-form'
import { ArrowLeft } from 'lucide-react'

export default async function EditJobPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getUser()
  if (!user) redirect('/login')
  const employerProfile = await getEmployerProfile(user.id)
  if (!employerProfile || employerProfile.status !== 'approved') {
    redirect('/employer')
  }

  const { id } = await params
  const job = await getJobById(id)
  if (!job || job.employerUserId !== user.id) {
    notFound()
  }

  const initialData: JobFormData = {
    id: job.id,
    title: job.title,
    description: job.description,
    requiredSpecializations: job.requiredSpecializations ?? [],
    preferredSpecializations: job.preferredSpecializations ?? [],
    minimumExperience: job.minimumExperience,
    preferredLocation: job.preferredLocation,
    requiredBar: job.requiredBar ?? [],
    requiredTechnicalDomains: job.requiredTechnicalDomains ?? [],
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <Link
          href="/employer/jobs"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          Jobs
        </Link>
        <span className="text-muted-foreground">/</span>
        <Link
          href={`/employer/jobs/${job.id}`}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          {job.title}
        </Link>
        <span className="text-muted-foreground">/</span>
        <span>Edit</span>
      </div>

      <div>
        <h1 className="font-[family-name:var(--font-outfit)] text-2xl font-bold tracking-tight">Edit Job</h1>
        <p className="text-muted-foreground mt-1">
          Update your job requirements. Changing requirements will clear
          existing match results.
        </p>
      </div>

      <JobForm mode="edit" initialData={initialData} action={updateJobAction} />
    </div>
  )
}
