import type { JobMatchDTO, MatchCardProfilePreview } from '@/lib/dal/job-matches'
import { MatchCard } from './match-card'

export function MatchResults({
  matches,
  profilePreviews,
}: {
  matches: JobMatchDTO[]
  profilePreviews: Map<string, MatchCardProfilePreview>
}) {
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        {matches.length} candidate{matches.length !== 1 ? 's' : ''} matched
      </p>

      {matches.map((match) => (
        <MatchCard
          key={match.id}
          match={match}
          profile={profilePreviews.get(match.profileId)}
        />
      ))}
    </div>
  )
}
