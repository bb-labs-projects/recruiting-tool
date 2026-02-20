'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateJobStatusAction } from '@/actions/jobs'
import { Button } from '@/components/ui/button'

type Props = {
  jobId: string
  currentStatus: 'draft' | 'open' | 'closed' | 'archived'
}

export function StatusControls({ jobId, currentStatus }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleStatusChange(
    newStatus: 'open' | 'closed' | 'archived'
  ) {
    setLoading(true)
    setError(null)

    const result = await updateJobStatusAction(jobId, newStatus)

    setLoading(false)
    if (result?.error) {
      setError(result.error)
    } else {
      router.refresh()
    }
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      <div className="flex items-center gap-3">
        {currentStatus === 'draft' && (
          <Button
            onClick={() => handleStatusChange('open')}
            disabled={loading}
            size="sm"
          >
            {loading ? 'Updating...' : 'Publish (Draft -> Open)'}
          </Button>
        )}
        {currentStatus === 'open' && (
          <Button
            onClick={() => handleStatusChange('closed')}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            {loading ? 'Updating...' : 'Close (Open -> Closed)'}
          </Button>
        )}
        {currentStatus === 'closed' && (
          <Button
            onClick={() => handleStatusChange('archived')}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            {loading ? 'Updating...' : 'Archive (Closed -> Archived)'}
          </Button>
        )}
        {currentStatus === 'archived' && (
          <p className="text-sm text-muted-foreground">
            This job is archived. No further status changes available.
          </p>
        )}
      </div>
    </div>
  )
}
