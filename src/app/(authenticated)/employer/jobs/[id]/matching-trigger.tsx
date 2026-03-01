'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, RefreshCw, Clock } from 'lucide-react'

type Props = {
  jobId: string
  matchingStatus: 'pending' | 'running' | 'failed' | 'completed'
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

      if (data.matchingStatus === 'completed') {
        setPolling(false)
        setStatus('completed')
        router.refresh()
      } else if (data.matchingStatus === 'failed') {
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

      // The run endpoint is synchronous -- matching is done when it returns.
      // Stop polling and refresh the page to show new results.
      setPolling(false)
      setStatus('completed')
      router.refresh()
    } catch (err) {
      setPolling(false)
      setStatus('failed')
      setError(err instanceof Error ? err.message : 'Failed to start matching')
    }
  }

  // Compact inline rerun button when matches are already displayed
  if (matchingStatus === 'completed' && status !== 'running') {
    return (
      <div className="flex items-center gap-3">
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        <Button variant="outline" size="sm" onClick={handleRunMatching}>
          <RefreshCw className="mr-2 size-4" />
          Rerun Matching
        </Button>
      </div>
    )
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

  if (status === 'failed') {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="mb-3 text-sm text-red-600 dark:text-red-400">
            {error ?? 'The previous matching attempt failed.'}
          </p>
          <Button onClick={handleRunMatching}>Retry Matching</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="flex items-start gap-3 py-6">
        <Clock className="text-muted-foreground mt-0.5 size-5 shrink-0" />
        <div>
          <p className="text-sm font-medium">Pending admin review</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Your job listing is being reviewed by our team. Candidate matching
            will begin once it has been approved.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
