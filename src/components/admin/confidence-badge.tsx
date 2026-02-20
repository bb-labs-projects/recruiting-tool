import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const confidenceStyles = {
  high: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  low: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
} as const

const confidenceLabels = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
} as const

export function ConfidenceBadge({
  level,
  className,
}: {
  level: 'high' | 'medium' | 'low'
  className?: string
}) {
  return (
    <Badge
      variant="outline"
      className={cn(confidenceStyles[level], 'border-transparent', className)}
    >
      {confidenceLabels[level]}
    </Badge>
  )
}
