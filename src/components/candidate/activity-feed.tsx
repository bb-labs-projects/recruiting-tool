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

      {/* Stats grid -- 2x2 for sidebar, 4-col on wider */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-center">
          <span className="font-mono text-[16px] font-semibold text-foreground block">
            {stats.viewsThisWeek}
          </span>
          <span className="text-[11px] text-muted-foreground">Views</span>
        </div>
        <div className="rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-center">
          <span className="font-mono text-[16px] font-semibold text-foreground block">
            {stats.totalSaves}
          </span>
          <span className="text-[11px] text-muted-foreground">Saves</span>
        </div>
        <div className="rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-center">
          <span className="font-mono text-[16px] font-semibold text-foreground block">
            {stats.totalUnlocks}
          </span>
          <span className="text-[11px] text-muted-foreground">Unlocks</span>
        </div>
        <div className="rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-center">
          <span className="font-mono text-[16px] font-semibold text-foreground block">
            {stats.totalMatches}
          </span>
          <span className="text-[11px] text-muted-foreground">Matches</span>
        </div>
      </div>

      {/* Event list */}
      {events.length > 0 ? (
        <>
          <h3 className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground font-medium mb-2.5">
            Recent
          </h3>
          <div className="space-y-2.5">
            {events.map((event) => {
              const config = eventConfig[event.type]
              const Icon = config.icon
              return (
                <div key={event.id} className="flex items-start gap-2.5">
                  <Icon className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-foreground/80 leading-snug">
                      {config.label}
                    </p>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {relativeTime(event.timestamp)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      ) : (
        <div className="rounded-lg border border-dashed border-border bg-muted/50 p-4 text-center">
          <Eye className="size-4 text-muted-foreground mx-auto mb-1.5" />
          <p className="text-[12px] text-muted-foreground">
            No activity yet. When employers interact with your profile,
            you&apos;ll see it here.
          </p>
        </div>
      )}

      <div className="border-t border-border mt-8" />
    </div>
  )
}
