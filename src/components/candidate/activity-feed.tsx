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
      <h2 className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground font-medium mb-4">
        Activity
      </h2>

      {/* Stats row */}
      <div className="flex items-center gap-12 mb-8">
        <div className="flex flex-col">
          <span className="font-mono text-[14px] font-medium text-foreground">
            {stats.viewsThisWeek}
          </span>
          <span className="text-[12px] text-muted-foreground">Views this week</span>
        </div>
        <div className="h-8 w-[1px] bg-border" />
        <div className="flex flex-col">
          <span className="font-mono text-[14px] font-medium text-foreground">
            {stats.totalSaves}
          </span>
          <span className="text-[12px] text-muted-foreground">Saves</span>
        </div>
        <div className="h-8 w-[1px] bg-border" />
        <div className="flex flex-col">
          <span className="font-mono text-[14px] font-medium text-foreground">
            {stats.totalUnlocks}
          </span>
          <span className="text-[12px] text-muted-foreground">Unlocks</span>
        </div>
        <div className="h-8 w-[1px] bg-border" />
        <div className="flex flex-col">
          <span className="font-mono text-[14px] font-medium text-foreground">
            {stats.totalMatches}
          </span>
          <span className="text-[12px] text-muted-foreground">Matches</span>
        </div>
      </div>

      {/* Event list */}
      {events.length > 0 ? (
        <>
          <h3 className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground font-medium mb-3">
            Recent
          </h3>
          <div className="space-y-3">
            {events.map((event) => {
              const config = eventConfig[event.type]
              const Icon = config.icon
              return (
                <div key={event.id} className="flex items-center gap-3">
                  <Icon className="size-3.5 text-muted-foreground shrink-0" />
                  <span className="text-[13px] text-foreground/80 flex-1">
                    {config.label}
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground shrink-0">
                    {relativeTime(event.timestamp)}
                  </span>
                </div>
              )
            })}
          </div>
        </>
      ) : (
        <div className="rounded-lg border border-dashed border-border bg-muted/50 p-6 text-center">
          <Eye className="size-5 text-muted-foreground mx-auto mb-2" />
          <p className="text-[13px] text-muted-foreground">
            No activity yet. When employers interact with your profile,
            you&apos;ll see it here.
          </p>
        </div>
      )}

      <div className="border-t border-border mt-10" />
    </div>
  )
}
