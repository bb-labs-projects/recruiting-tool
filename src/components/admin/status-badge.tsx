import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const statusStyles = {
  pending_review: 'bg-amber-50 text-amber-700 border-amber-200',
  active: 'bg-teal-50 text-teal-700 border-teal-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
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
      className={cn(statusStyles[status], className)}
    >
      {statusLabels[status]}
    </Badge>
  )
}
