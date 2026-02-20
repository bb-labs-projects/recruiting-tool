'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

type Props = {
  jobId: string
  matchingStatus: 'pending' | 'running' | 'failed'
}

export function MatchingTrigger({ jobId, matchingStatus }: Props) {
  const router = useRouter()
  const [status, setStatus] = useState(matchingStatus)
  const [error, setError] = useState<string | null>(
    matchingStatus === 'failed' ? 'Matching failed. You can retry.' : null
  )
  const [polling, setPolling] = useState(matchingStatus === 'running')

  const pollStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/matching/status?jobId=${jobId}`)
      if (!res.ok) return
      const data = await res.json()

      if (data.status === 'completed') {
        setPolling(false)
        setStatus('completed' as never)
        router.refresh()
      } else if (data.status === 'failed') {
        setPolling(false)
        setStatus('failed')
        setError('Matching failed. You can retry.')
      }
    } catch {
      // Silently continue polling
    }
  }, [jobId, router])

  useEffect(() => {
    if (!polling) return

    const interval = setInterval(pollStatus, 2000)
    return () => clearInterval(interval)
  }, [polling, pollStatus])

  async function handleRunMatching() {
    setError(null)
    setStatus('running')
    setPolling(true)

    try {
      const res = await fetch('/api/matching/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to start matching')
      }
    } catch (err) {
      setPolling(false)
      setStatus('failed')
      setError(err instanceof Error ? err.message : 'Failed to start matching')
    }
  }

  if (status === 'running') {
    return (
      <Card>
        <CardContent className="flex items-center justify-center gap-3 py-8">
          <Loader2 className="size-5 animate-spin" />
          <p className="text-sm">Matching in progress... This may take a moment.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="py-8 text-center">
        {error && (
          <p className="mb-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        <p className="text-muted-foreground mb-4 text-sm">
          {status === 'failed'
            ? 'The previous matching attempt failed.'
            : 'Run AI matching to find candidates that fit this job.'}
        </p>
        <Button onClick={handleRunMatching}>
          {status === 'failed' ? 'Retry Matching' : 'Run Matching'}
        </Button>
      </CardContent>
    </Card>
  )
}
