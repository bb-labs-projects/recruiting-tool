import { Eye, Bookmark, Unlock, Zap } from 'lucide-react'
import type { CandidateActivity, ActivityEvent } from '@/lib/dal/candidate-activity'

function relativeTime(date: Date): string {
  const now = Date.now()
  const diff = now - date.getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  return `${weeks}w ago`
}

const eventConfig: Record<
  ActivityEvent['type'],
  { icon: typeof Eye; label: string }
> = {
  view: { icon: Eye, label: 'An employer viewed your profile' },
  save: { icon: Bookmark, label: 'An employer saved your profile' },
  unlock: { icon: Unlock, label: 'An employer unlocked your full profile' },
  match: { icon: Zap, label: 'You were matched with a new opportunity' },
}

export function ActivityFeed({ activity }: { activity: CandidateActivity }) {
  const { stats, events } = activity

  return (
    <div className="mb-10">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.08em] text-[oklch(0.55_0_0)] font-medium mb-4">
        Activity
      </h2>

      {/* Stats row */}
      <div className="flex items-center gap-12 mb-8">
        <div className="flex flex-col">
          <span className="font-mono text-[14px] font-medium text-[oklch(0.12_0_0)]">
            {stats.viewsThisWeek}
          </span>
          <span className="text-[12px] text-[oklch(0.55_0_0)]">Views this week</span>
        </div>
        <div className="h-8 w-[1px] bg-[oklch(0.90_0_0)]" />
        <div className="flex flex-col">
          <span className="font-mono text-[14px] font-medium text-[oklch(0.12_0_0)]">
            {stats.totalSaves}
          </span>
          <span className="text-[12px] text-[oklch(0.55_0_0)]">Saves</span>
        </div>
        <div className="h-8 w-[1px] bg-[oklch(0.90_0_0)]" />
        <div className="flex flex-col">
          <span className="font-mono text-[14px] font-medium text-[oklch(0.12_0_0)]">
            {stats.totalUnlocks}
          </span>
          <span className="text-[12px] text-[oklch(0.55_0_0)]">Unlocks</span>
        </div>
        <div className="h-8 w-[1px] bg-[oklch(0.90_0_0)]" />
        <div className="flex flex-col">
          <span className="font-mono text-[14px] font-medium text-[oklch(0.12_0_0)]">
            {stats.totalMatches}
          </span>
          <span className="text-[12px] text-[oklch(0.55_0_0)]">Matches</span>
        </div>
      </div>

      {/* Event list */}
      {events.length > 0 ? (
        <>
          <h3 className="font-mono text-[10px] uppercase tracking-[0.08em] text-[oklch(0.55_0_0)] font-medium mb-3">
            Recent
          </h3>
          <div className="space-y-3">
            {events.map((event) => {
              const config = eventConfig[event.type]
              const Icon = config.icon
              return (
                <div key={event.id} className="flex items-center gap-3">
                  <Icon className="size-3.5 text-[oklch(0.55_0_0)] shrink-0" />
                  <span className="text-[13px] text-[oklch(0.30_0_0)] flex-1">
                    {config.label}
                  </span>
                  <span className="font-mono text-[11px] text-[oklch(0.55_0_0)] shrink-0">
                    {relativeTime(event.timestamp)}
                  </span>
                </div>
              )
            })}
          </div>
        </>
      ) : (
        <div className="rounded-lg border border-dashed border-[oklch(0.85_0_0)] bg-[oklch(0.98_0_0)] p-6 text-center">
          <Eye className="size-5 text-[oklch(0.55_0_0)] mx-auto mb-2" />
          <p className="text-[13px] text-[oklch(0.40_0_0)]">
            No activity yet. When employers interact with your profile,
            you&apos;ll see it here.
          </p>
        </div>
      )}

      <div className="border-t border-[oklch(0.90_0_0)] mt-10" />
    </div>
  )
}
