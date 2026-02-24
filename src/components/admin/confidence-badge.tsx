import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const confidenceStyles = {
  high: 'bg-teal-50 text-teal-700 border-teal-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  low: 'bg-red-50 text-red-700 border-red-200',
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
      className={cn(confidenceStyles[level], className)}
    >
      {confidenceLabels[level]}
    </Badge>
  )
}
