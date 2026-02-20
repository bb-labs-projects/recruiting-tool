import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const statusStyles = {
  pending_review: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
} as const

const statusLabels = {
  pending_review: 'Pending Review',
  active: 'Active',
  rejected: 'Rejected',
} as const

export function StatusBadge({
  status,
  className,
}: {
  status: 'pending_review' | 'active' | 'rejected'
  className?: string
}) {
  return (
    <Badge
      variant="outline"
      className={cn(statusStyles[status], 'border-transparent', className)}
    >
      {statusLabels[status]}
    </Badge>
  )
}
