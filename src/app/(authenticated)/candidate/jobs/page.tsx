import { getUser } from '@/lib/dal'
import { getCandidateProfileId, getOpenJobsForCandidate } from '@/lib/dal/candidate-jobs'
import { redirect } from 'next/navigation'
import { Briefcase, MapPin, Clock } from 'lucide-react'

function matchColor(recommendation: string): string {
  if (recommendation === 'Strong Match') return 'text-[oklch(0.55_0.14_155)]'
  if (recommendation === 'Good Match') return 'text-[oklch(0.55_0.10_250)]'
  if (recommendation === 'Partial Match') return 'text-[oklch(0.70_0.12_75)]'
  return 'text-[oklch(0.55_0_0)]'
}

function matchDotColor(recommendation: string): string {
  if (recommendation === 'Strong Match') return 'bg-[oklch(0.55_0.14_155)]'
  if (recommendation === 'Good Match') return 'bg-[oklch(0.55_0.10_250)]'
  if (recommendation === 'Partial Match') return 'bg-[oklch(0.70_0.14_85)]'
  return 'bg-[oklch(0.55_0_0)]'
}

function scoreBg(score: number): string {
  if (score >= 70) return 'bg-[oklch(0.55_0.14_155)]'
  if (score >= 40) return 'bg-[oklch(0.70_0.14_85)]'
  return 'bg-[oklch(0.55_0.16_20)]'
}

export default async function CandidateJobsPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  const profileId = await getCandidateProfileId(user.id)
  if (!profileId) redirect('/candidate')

  const jobs = await getOpenJobsForCandidate(profileId)

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-baseline gap-3">
          <h1 className="text-[oklch(0.12_0_0)] font-semibold text-[28px] tracking-tight">
            Browse Jobs
          </h1>
          <span className="font-mono text-[12px] text-[oklch(0.55_0_0)]">
            {jobs.length} {jobs.length === 1 ? 'position' : 'positions'}
          </span>
        </div>
        <p className="text-[13px] text-[oklch(0.50_0_0)] mt-1">
          Open positions from employers on the platform. Matched roles show your compatibility score.
        </p>
      </div>

      {/* Job list */}
      {jobs.length > 0 ? (
        <div className="space-y-3">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="rounded-lg border border-[oklch(0.90_0_0)] p-4 hover:border-[oklch(0.80_0_0)] transition-custom"
            >
              {/* Title row with match badge */}
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[14px] font-medium text-[oklch(0.12_0_0)]">
                  {job.title}
                </h3>
                {job.matchScore != null && job.matchRecommendation && (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${matchDotColor(job.matchRecommendation)}`} />
                      <span className={`text-[12px] font-medium ${matchColor(job.matchRecommendation)}`}>
                        {job.matchRecommendation}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-12 h-1.5 bg-[oklch(0.90_0_0)] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${scoreBg(job.matchScore)}`}
                          style={{ width: `${job.matchScore}%` }}
                        />
                      </div>
                      <span className="font-mono text-[11px] text-[oklch(0.40_0_0)]">
                        {job.matchScore}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Requirement tags */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {job.requiredSpecializations?.map((spec) => (
                  <span
                    key={spec}
                    className="text-[11px] text-[oklch(0.40_0_0)] bg-[oklch(0.96_0_0)] px-2 py-0.5 rounded"
                  >
                    {spec}
                  </span>
                ))}
                {job.requiredTechnicalDomains?.map((domain) => (
                  <span
                    key={domain}
                    className="text-[11px] text-[oklch(0.45_0.08_250)] bg-[oklch(0.96_0.02_250)] px-2 py-0.5 rounded"
                  >
                    {domain}
                  </span>
                ))}
                {job.requiredBar?.map((bar) => (
                  <span
                    key={bar}
                    className="text-[11px] text-[oklch(0.45_0.08_155)] bg-[oklch(0.96_0.02_155)] px-2 py-0.5 rounded"
                  >
                    {bar}
                  </span>
                ))}
              </div>

              {/* Experience + location inline */}
              <div className="flex items-center gap-4 mb-2 text-[12px] text-[oklch(0.55_0_0)]">
                {job.minimumExperience != null && (
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" />
                    {job.minimumExperience}+ years
                  </span>
                )}
                {job.preferredLocation && (
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3" />
                    {job.preferredLocation}
                  </span>
                )}
              </div>

              {/* Description truncated */}
              {job.description && (
                <p className="text-[12px] text-[oklch(0.50_0_0)] leading-relaxed line-clamp-2">
                  {job.description}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-[oklch(0.85_0_0)] bg-[oklch(0.98_0_0)] p-8 text-center">
          <Briefcase className="size-6 text-[oklch(0.55_0_0)] mx-auto mb-3" />
          <p className="text-[14px] font-medium text-[oklch(0.30_0_0)] mb-1">
            No open positions right now
          </p>
          <p className="text-[13px] text-[oklch(0.50_0_0)]">
            Check back soon -- new jobs are posted regularly.
          </p>
        </div>
      )}
    </div>
  )
}
