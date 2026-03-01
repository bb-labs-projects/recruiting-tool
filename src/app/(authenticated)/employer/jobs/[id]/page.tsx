import { getUser } from '@/lib/dal'
import { getEmployerProfile } from '@/lib/dal/admin-employers'
import { getJobById } from '@/lib/dal/jobs'
import { getMatchesForJob, getMatchCardProfiles, type MatchCardProfilePreview } from '@/lib/dal/job-matches'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Pencil } from 'lucide-react'
import { MatchResults } from '@/components/jobs/match-results'
import { MatchingTrigger } from './matching-trigger'

const statusColors: Record<string, string> = {
  draft: 'bg-amber-50 text-amber-700 border border-amber-200',
  open: 'bg-teal-50 text-teal-700 border border-teal-200',
  closed: 'bg-red-50 text-red-700 border border-red-200',
  archived: 'bg-stone-100 text-stone-600 border border-stone-200',
}

export default async function JobDetailPage({
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

  const matches =
    job.matchingStatus === 'completed' ? await getMatchesForJob(job.id) : []

  const profilePreviews =
    matches.length > 0
      ? await getMatchCardProfiles(
          matches.map((m) => m.profileId),
          user.id
        )
      : new Map<string, MatchCardProfilePreview>()

  const canEdit = job.status === 'draft' || job.status === 'open'

  // Build subtitle parts
  const subtitleParts: string[] = []
  if (job.requiredSpecializations && job.requiredSpecializations.length > 0) {
    subtitleParts.push(job.requiredSpecializations.join(', '))
  }
  if (job.minimumExperience != null) {
    subtitleParts.push(`${job.minimumExperience}+ years`)
  }
  if (job.requiredBar && job.requiredBar.length > 0) {
    subtitleParts.push(job.requiredBar.join(', '))
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/employer/jobs"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back to Jobs
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-sans text-2xl font-semibold">{job.title}</h1>
          {subtitleParts.length > 0 && (
            <p className="mt-1 text-sm text-muted-foreground">
              {subtitleParts.join(' / ')}
            </p>
          )}
          <div className="mt-2 flex items-center gap-2">
            <Badge className={statusColors[job.status] ?? ''}>
              {job.status}
            </Badge>
            <span className="text-muted-foreground text-sm">
              Created{' '}
              {job.createdAt.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>
        {canEdit && (
          <Button asChild variant="outline" size="sm" className="rounded-lg transition-all">
            <Link href={`/employer/jobs/${job.id}/edit`}>
              <Pencil className="mr-2 size-4" />
              Edit Job
            </Link>
          </Button>
        )}
      </div>

      {/* Job Details */}
      <Card className="rounded-xl shadow-sm">
        <CardContent className="space-y-4 pt-6">
          {job.description && (
            <div>
              <h2 className="mb-1 text-sm font-medium text-muted-foreground">
                Description
              </h2>
              <p className="text-sm whitespace-pre-wrap">{job.description}</p>
            </div>
          )}

          {job.requiredSpecializations &&
            job.requiredSpecializations.length > 0 && (
              <div>
                <h2 className="mb-2 text-sm font-medium text-muted-foreground">
                  Required Specializations
                </h2>
                <div className="flex flex-wrap gap-1.5">
                  {job.requiredSpecializations.map((spec) => (
                    <Badge key={spec} variant="secondary">
                      {spec}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

          {job.preferredSpecializations &&
            job.preferredSpecializations.length > 0 && (
              <div>
                <h2 className="mb-2 text-sm font-medium text-muted-foreground">
                  Preferred Specializations
                </h2>
                <div className="flex flex-wrap gap-1.5">
                  {job.preferredSpecializations.map((spec) => (
                    <Badge key={spec} variant="outline">
                      {spec}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

          {job.minimumExperience != null && (
            <div>
              <h2 className="mb-1 text-sm font-medium text-muted-foreground">
                Minimum Experience
              </h2>
              <p className="text-sm">{job.minimumExperience} years</p>
            </div>
          )}

          {job.preferredLocation && (
            <div>
              <h2 className="mb-1 text-sm font-medium text-muted-foreground">
                Preferred Location
              </h2>
              <p className="text-sm">{job.preferredLocation}</p>
            </div>
          )}

          {job.requiredBar && job.requiredBar.length > 0 && (
            <div>
              <h2 className="mb-2 text-sm font-medium text-muted-foreground">
                Required Bar Admissions
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {job.requiredBar.map((bar) => (
                  <Badge key={bar} variant="secondary">
                    {bar}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {job.requiredTechnicalDomains &&
            job.requiredTechnicalDomains.length > 0 && (
              <div>
                <h2 className="mb-2 text-sm font-medium text-muted-foreground">
                  Required Technical Domains
                </h2>
                <div className="flex flex-wrap gap-1.5">
                  {job.requiredTechnicalDomains.map((domain) => (
                    <Badge key={domain} variant="outline">
                      {domain}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
        </CardContent>
      </Card>

      {/* Matching Section */}
      <div className="space-y-4">
        <h2 className="font-sans text-xl font-semibold">Candidate Matches</h2>

        {job.matchingStatus === 'completed' && matches.length > 0 ? (
          <>
            <MatchingTrigger jobId={job.id} matchingStatus="completed" />
            <MatchResults matches={matches} profilePreviews={profilePreviews} />
          </>
        ) : job.matchingStatus === 'completed' && matches.length === 0 ? (
          <>
            <MatchingTrigger jobId={job.id} matchingStatus="completed" />
            <Card className="rounded-xl shadow-sm">
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground text-sm">
                  No matching candidates found. Try broadening your job
                  requirements.
                </p>
              </CardContent>
            </Card>
          </>
        ) : (
          <MatchingTrigger
            jobId={job.id}
            matchingStatus={job.matchingStatus as 'pending' | 'running' | 'failed'}
          />
        )}
      </div>
    </div>
  )
}
