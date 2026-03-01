import type { JobMatchDTO, MatchCardProfilePreview } from '@/lib/dal/job-matches'
import { MatchCard } from './match-card'

export function MatchResults({
  matches,
  profilePreviews,
  profileBasePath,
}: {
  matches: JobMatchDTO[]
  profilePreviews: Map<string, MatchCardProfilePreview>
  profileBasePath?: string
}) {
  const avgScore =
    matches.length > 0
      ? Math.round(matches.reduce((sum, m) => sum + m.overallScore, 0) / matches.length)
      : 0

  return (
    <div>
      <div className="flex items-center justify-between mb-8 border-b border-[oklch(0.90_0_0)] pb-4">
        <span className="font-mono text-[13px] text-[oklch(0.55_0_0)]">
          {matches.length} candidate{matches.length !== 1 ? 's' : ''} matched | Avg score{' '}
          {avgScore}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[80px_240px_120px_140px_1fr_120px] px-4 py-3 font-mono text-[11px] uppercase tracking-wide text-[oklch(0.55_0_0)] border-b border-[oklch(0.90_0_0)]">
        <div>Score</div>
        <div>Candidate</div>
        <div>Experience</div>
        <div>Key Match</div>
        <div>Requirement Tags</div>
        <div className="text-right">Actions</div>
      </div>

      <div className="divide-y divide-[oklch(0.90_0_0)]">
        {matches.map((match) => (
          <MatchCard
            key={match.id}
            match={match}
            profile={profilePreviews.get(match.profileId)}
            profileBasePath={profileBasePath}
          />
        ))}
      </div>
    </div>
  )
}
