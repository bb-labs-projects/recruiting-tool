import { Clock, XCircle, CheckCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

/**
 * Status banner for employer approval state.
 * Renders a colored banner with an icon indicating the employer's
 * current approval status. Can be used in layouts or individual pages.
 */
export function ApprovalBanner({
  status,
  companyName,
}: {
  status: 'pending' | 'approved' | 'rejected'
  companyName: string
}) {
  if (status === 'pending') {
    return (
      <div className="flex items-center gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/30">
        <Clock className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="flex flex-1 items-center justify-between">
          <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
            Account pending approval
          </span>
          <Badge variant="outline" className="border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-300">
            {companyName}
          </Badge>
        </div>
      </div>
    )
  }

  if (status === 'approved') {
    return (
      <div className="flex items-center gap-3 rounded-md border border-green-200 bg-green-50 px-4 py-3 dark:border-green-800 dark:bg-green-950/30">
        <CheckCircle className="h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
        <div className="flex flex-1 items-center justify-between">
          <span className="text-sm font-medium text-green-800 dark:text-green-200">
            Account approved
          </span>
          <Badge variant="outline" className="border-green-300 text-green-700 dark:border-green-700 dark:text-green-300">
            {companyName}
          </Badge>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-950/30">
      <XCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
      <div className="flex flex-1 items-center justify-between">
        <span className="text-sm font-medium text-red-800 dark:text-red-200">
          Account not approved
        </span>
        <Badge variant="outline" className="border-red-300 text-red-700 dark:border-red-700 dark:text-red-300">
          {companyName}
        </Badge>
      </div>
    </div>
  )
}
