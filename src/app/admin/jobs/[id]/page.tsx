import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getJobById } from '@/lib/dal/jobs'
import { getMatchesForJob, getUnnotifiedMatches, getMatchCardProfiles, type MatchCardProfilePreview } from '@/lib/dal/job-matches'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft } from 'lucide-react'
import { MatchResults } from '@/components/jobs/match-results'
import { MatchingTrigger } from '@/app/(authenticated)/employer/jobs/[id]/matching-trigger'
import { NotificationTrigger } from './notification-trigger'
import { StatusControls } from './status-controls'

const statusColors: Record<string, string> = {
  draft: 'bg-amber-50 text-amber-700 border-amber-200',
  open: 'bg-teal-50 text-teal-700 border-teal-200',
  closed: 'bg-stone-100 text-stone-600 border-stone-200',
  archived: 'bg-stone-100 text-stone-600 border-stone-200',
}

const matchingStatusColors: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  running: 'bg-blue-50 text-blue-700 border-blue-200',
  completed: 'bg-teal-50 text-teal-700 border-teal-200',
  failed: 'bg-red-50 text-red-700 border-red-200',
}

export default async function AdminJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const job = await getJobById(id)
  if (!job) notFound()

  const matches =
    job.matchingStatus === 'completed' ? await getMatchesForJob(job.id) : []
  const unnotifiedMatches = await getUnnotifiedMatches(job.id)

  // Admin view: load profile previews using the employer's userId for unlock context
  const profilePreviews =
    matches.length > 0
      ? await getMatchCardProfiles(
          matches.map((m) => m.profileId),
          job.employerUserId
        )
      : new Map<string, MatchCardProfilePreview>()

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/admin/jobs"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back to Jobs
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-[family-name:var(--font-outfit)]">{job.title}</h1>
        <div className="mt-2 flex items-center gap-2">
          <Badge className={statusColors[job.status] ?? ''}>
            {job.status}
          </Badge>
          <Badge className={matchingStatusColors[job.matchingStatus] ?? ''}>
            matching: {job.matchingStatus}
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

      {/* Employer Info */}
      <Card className="rounded-xl shadow-sm">
        <CardContent className="space-y-2 pt-6">
          <h2 className="text-sm font-medium text-muted-foreground">
            Employer
          </h2>
          <p className="text-sm">{job.employerEmail}</p>
        </CardContent>
      </Card>

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

      {/* Status Controls */}
      <Card className="rounded-xl shadow-sm">
        <CardContent className="space-y-4 pt-6">
          <h2 className="text-lg font-semibold">Job Status</h2>
          <StatusControls jobId={job.id} currentStatus={job.status} />
        </CardContent>
      </Card>

      {/* Matching Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold font-[family-name:var(--font-outfit)]">Candidate Matches</h2>

        {job.matchingStatus === 'completed' && matches.length > 0 ? (
          <>
            <NotificationTrigger
              jobId={job.id}
              unnotifiedCount={unnotifiedMatches.length}
            />
            <MatchResults matches={matches} profilePreviews={profilePreviews} profileBasePath="/admin/candidates" />
          </>
        ) : job.matchingStatus === 'completed' && matches.length === 0 ? (
          <Card className="rounded-xl shadow-sm">
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground text-sm">
                No matching candidates found.
              </p>
            </CardContent>
          </Card>
        ) : (
          <MatchingTrigger
            jobId={job.id}
            matchingStatus={
              job.matchingStatus as 'pending' | 'running' | 'failed'
            }
          />
        )}
      </div>
    </div>
  )
}
